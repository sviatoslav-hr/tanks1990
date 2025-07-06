import { Animation, easeOut } from '#/animation';
import { Color } from '#/color';
import { CELL_SIZE } from '#/const';
import { Entity, moveEntity } from '#/entity/core';
import { newEntityId } from '#/entity/id';
import { EntityManager } from '#/entity/manager';
import {
    createTankSpriteGroup,
    makeTankSchema,
    TankPartKind,
    TankSchema,
    TankSpriteGroup,
} from '#/entity/tank/generation';
import { eventQueue } from '#/events';
import { moveToRandomCorner } from '#/math';
import { Direction } from '#/math/direction';
import { Duration } from '#/math/duration';
import { Vector2Like } from '#/math/vector';
import { Renderer } from '#/renderer';
import { Sprite } from '#/renderer/sprite';

export abstract class Tank extends Entity {
    public dead = true;
    public hasShield = true;
    public direction = Direction.NORTH;
    public shouldRespawn = false;
    // TODO: Is this really a good idea to have this field here?
    public readonly bot: boolean = true;
    // TODO: No reason to store this in every tank instance, move this to a config.
    public maxSpeed = 0;
    public readonly topSpeedReachTime = Duration.milliseconds(150);
    public readonly stoppingTime = Duration.milliseconds(70);
    public readonly id = newEntityId();

    protected velocity: number = 0;
    protected lastAcceleration = 0;
    protected shieldTimer = Duration.zero();
    protected moving = false;
    protected readonly SHIELD_TIME = Duration.milliseconds(1000);
    protected abstract readonly shieldSprite: Sprite<string>;
    private readonly shieldBoundary = {
        x: this.x - this.width / 2,
        y: this.y - this.height / 2,
        width: this.width * 2,
        height: this.height * 2,
    };

    protected abstract sprite: TankSpriteGroup;
    protected abstract schema: TankSchema;
    protected shootingDelay = Duration.milliseconds(0);
    protected isStuck = false;
    public readonly healthAnimation = new Animation(Duration.milliseconds(300), easeOut).end();
    protected prevHealth = 0;

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

    draw(renderer: Renderer): void {
        if (!this.dead) {
            this.sprite.draw(renderer, this, this.direction);
            if (this.hasShield) {
                this.shieldSprite.draw(renderer, this.shieldBoundary);
            }

            if (this.manager.world.showBoundary) {
                renderer.setStrokeColor(Color.PINK);
                renderer.strokeBoundary(this, 1);
                renderer.setFont('400 16px Helvetica', 'center', 'middle');
                renderer.setFillColor(Color.WHITE);
                const velocity = ((this.velocity * 3600) / 1000).toFixed(2);
                const acc = this.lastAcceleration.toFixed(2);
                renderer.fillText(
                    `${this.id}: a=${acc};v=${velocity}km/h`,
                    // `ID:${this.id}: {${Math.floor(this.x)};${Math.floor(this.y)}}`,
                    {
                        x: this.x + this.width / 2,
                        y: this.y - this.height / 2,
                    },
                );
            }
        }
        if (!this.dead || this.healthAnimation.active) {
            this.drawHealthBar(renderer);
            const showBoundary = !this.dead && this.manager.world.showBoundary;
            // NOTE: It only makes sense to draw the shooting bar for bots for debug purposes
            if (!this.bot || showBoundary) {
                this.drawShootingBar(renderer);
            }
            if (showBoundary && this.isStuck) {
                renderer.setStrokeColor(Color.RED);
                renderer.strokeBoundary(this, 1);
            }
        }
    }

    protected drawHealthBar(renderer: Renderer) {
        // NOTE: Draw hp bar only if the tank is not full health.
        if (this.health === this.maxHealth) return;
        const barWidth = this.width * 0.9;
        // NOTE: Draw health bar in camera size, since it's a UI element and it should not scale.
        const barHeight = 3 / renderer.camera.scale;
        const barOffset = 6 / renderer.camera.scale;
        const barX = this.x + (this.width - barWidth) / 2;
        const barY = this.y - barHeight - barOffset;
        renderer.setFillColor(Color.GREEN_DARKEST);
        renderer.fillRect(barX, barY, barWidth, barHeight);
        let hpFraction = this.health / this.maxHealth || 0;
        if (!this.healthAnimation.finished) {
            const healthLostFraction = Math.abs(this.health - this.prevHealth) / this.maxHealth;
            hpFraction += (1 - this.healthAnimation.progress) * healthLostFraction;
        }
        if (hpFraction) {
            renderer.setFillColor(Color.GREEN);
            renderer.fillRect(barX, barY, barWidth * hpFraction, barHeight);
        }
    }

    protected drawShootingBar(renderer: Renderer): void {
        if (!this.shootingDelay.positive) return;
        const barWidth = this.width * 0.9;
        // NOTE: Draw health bar in camera size, since it's a UI element and it should not scale.
        const barHeight = 3 / renderer.camera.scale;
        const barOffset = 3 / renderer.camera.scale;
        const barX = this.x + (this.width - barWidth) / 2;
        const barY = this.y - barHeight - barOffset;
        renderer.setFillColor(Color.ORANGE_SAFFRON);
        const fraction =
            1 - this.shootingDelay.milliseconds / this.schema.shootingDelay.milliseconds;
        renderer.fillRect(barX, barY, barWidth * fraction, barHeight);
    }

    shoot(): void {
        if (this.shootingDelay.positive) return;
        this.shootingDelay.setFrom(this.schema.shootingDelay);
        eventQueue.push({
            type: 'shot',
            entityId: this.id,
            bot: this.bot,
            origin: this.getShootingOrigin(),
            direction: this.direction,
            damage: this.schema.damage,
        });
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

    takeDamage(damage: number): boolean {
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
            eventQueue.push({type: 'tank-destroyed', entityId: this.id, bot: this.bot});
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
