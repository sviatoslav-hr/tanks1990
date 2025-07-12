import {Animation, easeOut} from '#/animation';
import {CELL_SIZE} from '#/const';
import {Entity, moveEntity} from '#/entity/core';
import {newEntityId} from '#/entity/id';
import {EntityManager} from '#/entity/manager';
import {
    createTankSpriteGroup,
    makeTankSchema,
    TankPartKind,
    TankSchema,
    TankSpriteGroup,
} from '#/entity/tank/generation';
import {EventQueue, ShotEvent} from '#/events';
import {moveToRandomCorner} from '#/math';
import {Direction} from '#/math/direction';
import {Duration} from '#/math/duration';
import {Vector2Like} from '#/math/vector';
import {Sprite} from '#/renderer/sprite';

export abstract class Tank extends Entity {
    dead = true;
    hasShield = true;
    direction = Direction.NORTH;
    shouldRespawn = false;
    // TODO: Is this really a good idea to have this field here?
    readonly bot: boolean = true;
    // TODO: No reason to store this in every tank instance, move this to a config.
    maxSpeed = 0;
    readonly topSpeedReachTime = Duration.milliseconds(150);
    readonly stoppingTime = Duration.milliseconds(70);
    readonly id = newEntityId();

    public velocity: number = 0;
    public lastAcceleration = 0;
    shieldTimer = Duration.zero();
    moving = false;
    readonly SHIELD_TIME = Duration.milliseconds(1000);
    abstract readonly shieldSprite: Sprite<string>;
    readonly shieldBoundary = {
        x: this.x - this.width / 2,
        y: this.y - this.height / 2,
        width: this.width * 2,
        height: this.height * 2,
    };

    abstract sprite: TankSpriteGroup;
    abstract schema: TankSchema;
    shootingDelay = Duration.milliseconds(0);
    isStuck = false;
    readonly healthAnimation = new Animation(Duration.milliseconds(300), easeOut).end();
    prevHealth = 0;

    constructor(manager: EntityManager) {
        super(manager);
        this.x = 0;
        this.y = 0;
        this.width = CELL_SIZE * 0.8;
        this.height = CELL_SIZE * 0.8;
        this.maxHealth = 0;
    }

    get cx(): number {
        return this.x + this.width / 2;
    }

    get cy(): number {
        return this.y + this.height / 2;
    }

    update(dt: Duration): void {
        this.healthAnimation.update(dt);
        if (this.dead) return;

        this.shootingDelay.sub(dt).max(0);
        const prevX = this.x;
        const prevY = this.y;
        if (this.moving) this.sprite.update(dt);

        {
            const acceleration = this.moving
                ? this.maxSpeed / this.topSpeedReachTime.seconds
                : -this.velocity / this.stoppingTime.seconds;
            if (this.velocity > 0) {
                this.isStuck = false;
            }
            this.lastAcceleration = acceleration;
            // v' = a*dt + v
            const newVelocity = acceleration * dt.seconds + this.velocity;
            this.velocity = Math.min(Math.max(0, newVelocity), this.maxSpeed);
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
            this.stopMoving();
            this.isStuck = true;
        }
        this.updateShield(dt);
    }

    stopMoving(): void {
        this.velocity = 0;
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
            damage: this.schema.damage,
        };
    }

    respawn(force = false): boolean {
        if (force || this.tryRespawn(4)) {
            this.dead = false;
            this.health = this.maxHealth;
            this.prevHealth = this.health;
            this.shouldRespawn = false;
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
        }
        return this.dead;
    }

    changeKind(kind: TankPartKind): void {
        const schema = makeTankSchema(this.bot ? 'enemy' : 'player', kind);
        this.applySchema(schema);
        this.sprite = createTankSpriteGroup(schema);
    }

    protected applySchema(schema: TankSchema): void {
        this.schema = schema;
        this.maxHealth = schema.maxHealth;
        this.maxSpeed = schema.maxSpeed;
    }

    private tryRespawn(attemptLimit: number): boolean {
        assert(attemptLimit > 0, 'Limit should be greater than 0');
        const prevX = this.x;
        const prevY = this.y;
        for (let attempt = 0; attempt < attemptLimit; attempt++) {
            // TODO: Be more creative with spawn points
            moveToRandomCorner(this, this.room.boundary);
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

    activateShield(): void {
        this.hasShield = true;
        this.shieldTimer.setFrom(this.SHIELD_TIME);
        this.updateShieldBoundary();
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

    protected handleCollision(_target: Entity): void {}

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
