import {Animation, easeOut} from '#/animation';
import {CELL_SIZE} from '#/const';
import {Entity, moveEntity} from '#/entity/core';
import {newEntityId} from '#/entity/id';
import {EntityManager} from '#/entity/manager';
import {
    createTankSpriteGroup,
    makeTankSchema,
    SHIELD_SPAWN_DURATION,
    TankPartKind,
    TankSchema,
    TankSpriteGroup,
} from '#/entity/tank/generation';
import {EventQueue, ShotEvent} from '#/events';
import {moveToRandomCorner, Rect} from '#/math';
import {Direction} from '#/math/direction';
import {Duration} from '#/math/duration';
import {Vector2Like} from '#/math/vector';
import {Sprite} from '#/renderer/sprite';

const STOPPING_TIME = Duration.milliseconds(50);

export abstract class Tank extends Entity {
    abstract readonly bot: boolean;
    readonly id = newEntityId();
    dead = true;
    hasShield = true;
    direction = Direction.NORTH;
    shouldRespawn = false;

    velocity = 0;
    lastAcceleration = 0;
    moving = false;
    collided = false;
    speedMult = 1;
    damageMult = 1;

    shieldTimer = Duration.zero();
    shootingDelay = Duration.milliseconds(0);
    prevHealth = 0;
    healthAnimation = new Animation(Duration.milliseconds(300), easeOut).end();

    readonly shieldBoundary: Rect = {
        x: this.x - this.width / 2,
        y: this.y - this.height / 2,
        width: this.width * 2,
        height: this.height * 2,
    };
    abstract readonly shieldSprite: Sprite<string>;
    abstract sprite: TankSpriteGroup;
    abstract schema: TankSchema;

    constructor(protected manager: EntityManager) {
        super();
        this.x = 0;
        this.y = 0;
        this.width = CELL_SIZE * 0.8;
        this.height = CELL_SIZE * 0.8;
    }

    get cx(): number {
        return this.x + this.width / 2;
    }

    get cy(): number {
        return this.y + this.height / 2;
    }

    get needsHealing(): boolean {
        return this.health < this.schema.maxHealth;
    }

    update(dt: Duration): void {
        this.healthAnimation.update(dt);
        if (this.dead) return;

        this.shootingDelay.sub(dt).max(0);
        const prevX = this.x;
        const prevY = this.y;

        if (this.moving) {
            this.sprite.update(dt);
            // On every frame just assume that the tank is not colliding anymore if it's still moving.
            this.collided = false;
        }

        {
            const maxSpeed = this.schema.maxSpeed * this.speedMult;
            // NOTE: Scale also the stopping time, otherwise the tank is too difficult to control.
            const stoppingTime = STOPPING_TIME.seconds / this.speedMult;
            const acceleration = this.moving
                ? maxSpeed / this.schema.topSpeedReachTime.seconds
                : -this.velocity / stoppingTime;

            this.lastAcceleration = acceleration;
            const newVelocity = acceleration * dt.seconds + this.velocity;
            // v' = a*dt + v
            this.velocity = Math.min(Math.max(0, newVelocity), maxSpeed);
            assert(this.velocity >= 0);
            // p' = 1/2*a*dt^2 + v*dt + p   ==>    dp = p' - p = 1/2*a*dt^2 + v*dt
            const movementOffset =
                0.5 * acceleration * dt.seconds ** 2 + this.velocity * dt.seconds;
            moveEntity(this, movementOffset, this.direction);
        }

        const collided = this.manager.findCollided(this);
        if (collided) {
            this.handleCollision(collided);
            this.x = prevX;
            this.y = prevY;
            this.velocity = 0;
            if (collided instanceof Tank) {
                collided.handleCollision(this);
                collided.collided = true;
            }
        }
        this.updateShield(dt);
    }

    shoot(): ShotEvent | null {
        if (this.shootingDelay.positive) return null;
        this.shootingDelay.setFrom(this.schema.shootingDelay);
        return {
            type: 'shot',
            entityId: this.id,
            bot: this.bot,
            origin: this.getShootingOrigin(),
            direction: this.direction,
            // Round to avoid situations when entity has less than 1 hp.
            damage: Math.round(this.schema.damage * this.damageMult),
        };
    }

    respawn(force = false): boolean {
        if (force || this.tryRespawn(4)) {
            this.dead = false;
            this.health = this.schema.maxHealth;
            this.prevHealth = this.health;
            this.collided = false;
            this.shouldRespawn = false;
            this.damageMult = 1;
            this.speedMult = 1;
            this.shootingDelay.setFrom(this.schema.shootingDelay);
            this.activateShield();
            return true;
        }
        return false;
    }

    takeDamage(damage: number, events: EventQueue): boolean {
        if (this.dead) {
            logger.error('[Tank] Trying to kill a dead entity');
            return false;
        }
        if (this.hasShield) {
            return false;
        }
        this.prevHealth = this.health;
        this.health = Math.max(0, this.health - damage);
        // TODO: If the animation is still active, it should not just reset,
        //       but instead make a smooth transition. Otherwise there might be cases when health
        //       goes down and then up and then down again, which is a visual bug.
        this.healthAnimation.reset();
        this.dead = this.health <= 0;
        if (this.dead) {
            this.onDied();
            events.push({type: 'tank-destroyed', entityId: this.id, bot: this.bot});
        } else if (this.health < this.prevHealth) {
            events.push({
                type: 'tank-damaged',
                entityId: this.id,
                bot: this.bot,
            });
        }
        return this.dead;
    }

    changeKind(kind: TankPartKind): void {
        const schema = makeTankSchema(this.bot, kind);
        this.schema = schema;
        this.sprite = createTankSpriteGroup(this.bot, schema);
    }

    private tryRespawn(attemptLimit: number): boolean {
        assert(attemptLimit > 0, 'Limit should be greater than 0');
        const prevX = this.x;
        const prevY = this.y;
        for (let attempt = 0; attempt < attemptLimit; attempt++) {
            // TODO: Be more creative with spawn points
            moveToRandomCorner(this, this.manager.world.activeRoom.boundary);
            const collided = this.manager.findCollided(this);
            if (!collided) {
                return true;
            }
            collided.DEBUG_collidedCount += 1;
        }
        this.x = prevX;
        this.y = prevY;
        return false;
    }

    restoreHealthAmount(amount: number): boolean {
        assert(!this.dead);
        assert(this.needsHealing);
        this.prevHealth = this.health;
        this.health = Math.min(this.schema.maxHealth, this.health + amount);
        return true;
    }

    activateShield(duration: Duration = SHIELD_SPAWN_DURATION): void {
        if (this.hasShield) {
            this.shieldTimer.add(duration);
        } else {
            this.hasShield = true;
            this.shieldTimer.setFrom(duration);
            this.updateShieldBoundary();
        }
    }

    protected updateShield(dt: Duration): void {
        this.shieldSprite.update(dt);
        if (this.shieldTimer.positive || this.hasShield) {
            this.shieldTimer.sub(dt).max(0);
            this.updateShieldBoundary();
            if (!this.shieldTimer.positive) {
                this.hasShield = false;
            }
        }
    }

    private updateShieldBoundary(): void {
        const padding = 3;
        this.shieldBoundary.x = this.x - padding;
        this.shieldBoundary.y = this.y - padding;
        this.shieldBoundary.width = this.width + padding * 2;
        this.shieldBoundary.height = this.height + padding * 2;
    }

    handleCollision(_target: Entity): void {
        this.collided = true;
    }

    protected onDied(): void {}

    private getShootingOrigin(): Vector2Like {
        switch (this.direction) {
            case Direction.NORTH:
                return {x: this.x + this.width / 2, y: this.y};
            case Direction.EAST:
                return {x: this.x + this.width, y: this.y + this.height / 2};
            case Direction.SOUTH:
                return {x: this.x + this.width / 2, y: this.y + this.height};
            case Direction.WEST:
                return {x: this.x, y: this.y + this.height / 2};
        }
    }
}
