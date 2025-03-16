import {Animation} from '#/animation';
import {Color} from '#/color';
import {CELL_SIZE} from '#/const';
import {Direction, Entity, clampByBoundary, moveEntity} from '#/entity/core';
import {newEntityId} from '#/entity/id';
import {EntityManager} from '#/entity/manager';
import {findPath} from '#/entity/pathfinding';
import {Sprite, createShieldSprite, createTankSprite} from '#/entity/sprite';
import {eventQueue} from '#/events';
import {GameInput} from '#/game-input';
import {moveToRandomCorner, sameSign} from '#/math';
import {Duration} from '#/math/duration';
import {Vector2, Vector2Like} from '#/math/vector';
import {Renderer} from '#/renderer';

export abstract class Tank extends Entity {
    public dead = true;
    public hasShield = true;
    public direction = Direction.NORTH;
    // TODO: Is this really a good idea to have this field here?
    public readonly bot: boolean = true;
    // TODO: No reason to store this in every tank instance, move this to a config.
    public readonly topSpeed = (300 * 1000) / 3600; // in m/s
    public readonly topSpeedReachTime = Duration.milliseconds(150);
    public readonly stoppingTime = Duration.milliseconds(70);
    public readonly id = newEntityId();

    protected velocity: number = 0;
    protected lastAcceleration = 0;
    protected shieldTimer = Duration.zero();
    protected moving = false;
    protected readonly SHOOTING_PERIOD = Duration.milliseconds(300);
    protected readonly SHIELD_TIME = Duration.milliseconds(1000);
    // TODO: Reuse shield sprite for all tanks (since it's the same)
    protected readonly shieldSprite = createShieldSprite();
    private readonly shieldBoundary = {
        x: this.x - this.width / 2,
        y: this.y - this.height / 2,
        width: this.width * 2,
        height: this.height * 2,
    };

    protected abstract readonly sprite: Sprite<string>;
    protected shootingDelay = this.SHOOTING_PERIOD.clone();
    protected isStuck = false;

    constructor(manager: EntityManager) {
        super(manager);
        // NOTE: spawn outside of the screen, expected to respawn
        this.x = -(2 * this.width);
        this.y = -(2 * this.height);
        this.width = CELL_SIZE - 8;
        this.height = CELL_SIZE - 8;
    }

    get cx(): number {
        return this.x + this.width / 2;
    }

    get cy(): number {
        return this.y + this.height / 2;
    }

    update(dt: Duration): void {
        if (this.dead) {
            return;
        }

        this.shootingDelay.sub(dt).max(0);
        const prevX = this.x;
        const prevY = this.y;
        if (this.moving) {
            this.sprite.update(dt);
        }

        {
            const acceleration = this.moving
                ? this.topSpeed / this.topSpeedReachTime.seconds
                : -this.velocity / this.stoppingTime.seconds;
            if (this.velocity > 0) {
                this.isStuck = false;
            }
            this.lastAcceleration = acceleration;
            const dtSeconds = dt.seconds;
            // v' = a*dt + v
            const newVelocity = acceleration * dtSeconds + this.velocity;
            this.velocity = Math.min(Math.max(0, newVelocity), this.topSpeed);
            assert(this.velocity >= 0);
            // p' = 1/2*a*dt^2 + v*dt + p   ==>    dp = p'-p = 1/2*a*dt^2 + v*dt
            const movementOffset =
                0.5 * acceleration * dtSeconds * dtSeconds + this.velocity * dtSeconds;
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
        if (!this.manager.env.isInfinite) {
            const oldX = this.x;
            const oldY = this.y;
            clampByBoundary(this, this.manager.env.boundary);
            if (oldX !== this.x || oldY !== this.y) {
                this.stopMoving();
                this.isStuck = true;
            }
        }
        this.updateShield(dt);
    }

    stopMoving(): void {
        this.velocity = 0;
    }

    draw(renderer: Renderer): void {
        if (this.dead) return;
        this.sprite.draw(renderer, this, this.direction);
        if (this.hasShield) {
            this.shieldSprite.draw(renderer, this.shieldBoundary);
        }

        if (this.manager.env.showBoundary) {
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
        if (this.manager.env.showBoundary && this.isStuck) {
            renderer.setStrokeColor(Color.RED);
            renderer.strokeBoundary(this, 1);
        }
    }

    shoot(): void {
        if (this.shootingDelay.positive) return;
        this.shootingDelay.setFrom(this.SHOOTING_PERIOD);
        eventQueue.push({
            type: 'shot',
            entityId: this.id,
            bot: this.bot,
            origin: this.getShootingOrigin(),
            direction: this.direction,
        });
    }

    respawn(): boolean {
        const env = this.manager.env;
        const playerInInfinite = env.isInfinite && !this.bot;
        if (playerInInfinite) {
            // NOTE: in infinite mode, player is always in the center
            const boundary = env.boundary;
            this.x = boundary.x + boundary.width / 2 - this.width / 2;
            this.y = boundary.y + boundary.height / 2 - this.height / 2;
        }
        if (playerInInfinite || this.tryRespawn(4)) {
            this.dead = false;
            this.shootingDelay.setFrom(this.SHOOTING_PERIOD);
            this.activateShield();
            return true;
        }
        return false;
    }

    takeDamage(): boolean {
        if (this.dead) {
            console.error('ERROR: Trying to kill a dead entity');
            return false;
        }
        const dead = !this.hasShield;
        if (dead) {
            this.dead = true;
            this.onDied();
            eventQueue.push({type: 'tank-destroyed', entityId: this.id, bot: this.bot});
        }
        return dead;
    }

    private tryRespawn(attemptLimit: number): boolean {
        assert(attemptLimit > 0, 'Limit should be greater than 0');
        const prevX = this.x;
        const prevY = this.y;
        for (let attempt = 0; attempt < attemptLimit; attempt++) {
            moveToRandomCorner(this, this.manager.env.boundary);
            const collided = this.manager.findCollided(this);
            if (!collided) {
                return true;
            }
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
        this.shieldBoundary.x = this.x - this.width / 2;
        this.shieldBoundary.y = this.y - this.height / 2;
        this.shieldBoundary.width = this.width * 2;
        this.shieldBoundary.height = this.height * 2;
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

export class PlayerTank extends Tank implements Entity {
    public readonly topSpeed = (480 * 1000) / 3600; // in m/s
    public readonly topSpeedReachTime = Duration.milliseconds(50); // in seconds
    protected readonly SHOOTING_PERIOD = Duration.milliseconds(500);
    public readonly bot: boolean = false;
    public readonly survivedFor = Duration.zero();

    public dead = true;
    public score = 0;
    public invincible = false;

    protected readonly sprite = createTankSprite('player');

    constructor(manager: EntityManager) {
        super(manager);
        this.x = 0;
        this.y = 0;
    }

    override update(dt: Duration): void {
        super.update(dt);
        if (this.dead) return;
        this.survivedFor.add(dt);
    }

    override respawn(): boolean {
        const respawned = super.respawn();
        this.shootingDelay.milliseconds = 0;
        this.score = 0;
        this.survivedFor.milliseconds = 0;
        return respawned;
    }

    override takeDamage(): boolean {
        if (this.invincible) return false;
        return super.takeDamage();
    }

    // TODO: Should be handled in the main loop *probably*
    handleKeyboard(keyboard: GameInput): void {
        let newDirection: Direction | null = null;
        if (keyboard.isDown('KeyA')) {
            newDirection = Direction.WEST;
        }
        if (keyboard.isDown('KeyD')) {
            if (newDirection === Direction.WEST) {
                newDirection = null;
            } else {
                newDirection = Direction.EAST;
            }
        }
        if (keyboard.isDown('KeyW')) {
            newDirection = Direction.NORTH;
        }
        if (keyboard.isDown('KeyS')) {
            if (newDirection === Direction.NORTH) {
                newDirection = null;
            } else {
                newDirection = Direction.SOUTH;
            }
        }
        if (keyboard.isDown('Space') && !this.shootingDelay.positive) {
            this.shoot();
        }
        this.moving = newDirection != null;
        if (newDirection != null) {
            if (newDirection !== this.direction) {
                this.velocity = 0;
            }
            this.direction = newDirection;
        }
    }
}

export class EnemyTank extends Tank implements Entity {
    private static readonly RESPAWN_DELAY = Duration.milliseconds(2000);
    protected moving = true;
    protected readonly SHOOTING_PERIOD = Duration.milliseconds(1500);
    protected readonly sprite = createTankSprite('enemy');
    private readonly SEARCH_DELAY = Duration.milliseconds(5000);
    private targetSearchTimer = this.SEARCH_DELAY.clone();
    private targetPath: Vector2[] = [];
    private collided = false;
    private readonly collisionAnimation = new Animation(Duration.milliseconds(1000)).end();
    readonly respawnDelay = EnemyTank.RESPAWN_DELAY.clone();

    update(dt: Duration): void {
        this.respawnDelay.sub(dt).max(0);
        const player = this.manager.player;
        // NOTE: is collided, don't change the direction, allowing entities to move away from each other
        if (this.collided) {
            this.velocity = 0;
        }
        if (!this.dead) {
            // TODO: if player is dead, choose a random direction
            let newDirection = player.dead ? null : this.findTargetDirection(player, dt);
            if (newDirection != null && newDirection !== this.direction) {
                this.velocity = 0;
                this.direction = newDirection;
            }
        }
        this.collisionAnimation.update(dt);
        this.collided = false;
        const targetPoint = this.targetPath[0] ?? null;
        if (targetPoint && !this.dead) {
            const dxPrev = this.cx - targetPoint.x;
            const dyPrev = this.cy - targetPoint.y;
            super.update(dt);
            if (!this.isStuck) {
                this.handleMaybeMissedTargetPoint(targetPoint, dxPrev, dyPrev);
            }
        } else {
            super.update(dt);
        }
        // TODO: Can we still achieve this check without providing the camera?
        // if (camera.isRectVisible(this)) { this.shoot(); }
        this.shoot();
    }

    draw(renderer: Renderer): void {
        const env = this.manager.env;
        super.draw(renderer);
        if (this.dead) return;
        if (env.showBoundary) {
            // if (this.collisionAnimation.active) {
            //     renderer.setStrokeColor(Color.WHITE_NAVAJO);
            //     renderer.strokeBoundary(this, this.collisionAnimation.progress * 10);
            // }
            if (this.isStuck) {
                renderer.setStrokeColor(Color.RED);
                renderer.strokeBoundary(this, 1);
            }
            if (!this.manager.player.dead) {
                this.drawPath(renderer);
            }
        }
    }

    respawn(): boolean {
        if (this.respawnDelay.positive) return false;
        this.targetPath = [];
        this.targetSearchTimer.setMilliseconds(0);
        return super.respawn();
    }

    private handleMaybeMissedTargetPoint(targetPoint: Vector2, dxPrev: number, dyPrev: number) {
        const dx = this.cx - targetPoint.x;
        const dy = this.cy - targetPoint.y;
        // NOTE: If entity overstepped the target point, stop it and move back to target.
        //       But only if case of a turn, because in a straight line tank starts bugging.
        if ((dxPrev === dx && !sameSign(dyPrev, dy)) || (dyPrev === dy && !sameSign(dxPrev, dx))) {
            this.targetPath.shift();
            if (this.isAtPoint(targetPoint)) {
            }
            const nextPoint = this.targetPath[0];
            if (nextPoint) {
                const nextDir = this.getDirectionToPoint(nextPoint);
                if (!nextDir) return;
                const targetDir = this.direction;
                if (targetDir === nextDir) {
                    return;
                }
                this.velocity = 0;
                const prevX = this.x;
                const prevY = this.y;
                if (dxPrev === dx) {
                    this.y = targetPoint.y - this.height / 2;
                } else if (dyPrev === dy) {
                    this.x = targetPoint.x - this.width / 2;
                }
                const c = this.manager.findCollided(this);
                if (c) {
                    this.x = prevX;
                    this.y = prevY;
                }
            }
        }
    }

    protected override handleCollision(target: Entity): void {
        this.collided = true;
        this.collisionAnimation.reset();
        if (target.id !== this.manager.player.id) {
            this.direction = this.recalculateDirectionPath(target) ?? this.direction;
        }
        if (target instanceof EnemyTank) {
            target.collided = true;
            target.collisionAnimation.reset();
        }
    }

    protected override onDied(): void {
        this.respawnDelay.setFrom(EnemyTank.RESPAWN_DELAY);
    }

    private findTargetDirection(target: Entity, dt: Duration): Direction | null {
        this.targetSearchTimer.sub(dt).max(0);
        if (this.targetPath.length && this.targetSearchTimer.positive) {
            const targetPoint = this.targetPath[0];
            if (!targetPoint) return null;
            if (this.isAtPoint(targetPoint)) {
                this.targetPath.shift();
                const nextPoint = this.targetPath[0];
                return nextPoint ? this.getDirectionToPoint(nextPoint) : null;
            }
            return this.getDirectionToPoint(targetPoint);
        }

        return this.recalculateDirectionPath(target);
    }

    private recalculateDirectionPath(target: Entity): Direction | null {
        this.targetSearchTimer.setFrom(this.SEARCH_DELAY);
        const path = findPath(this, target, this.manager, 100);
        if (path) {
            this.targetPath = path;
            const nextPoint = this.targetPath[0];
            assert(nextPoint);
            return this.getDirectionToPoint(nextPoint);
        }
        return null;
    }

    private isAtPoint(next: Vector2): boolean {
        // NOTE: If entity is close enough to the target point, consider it reached
        const eps = 1;
        const diff = Math.max(Math.abs(this.cx - next.x), Math.abs(this.cy - next.y));
        return diff < eps;
    }

    private getDirectionToPoint(next: Vector2Like): Direction | null {
        const dx = next.x - Math.floor(this.cx);
        if (dx !== 0) {
            return dx > 0 ? Direction.EAST : Direction.WEST;
        }
        const dy = next.y - Math.floor(this.cy);
        if (dy !== 0) {
            return dy > 0 ? Direction.SOUTH : Direction.NORTH;
        }
        return null;
    }

    private drawPath(renderer: Renderer): void {
        if (this.targetPath.length < 2) {
            return;
        }
        renderer.setStrokeColor(Color.RED);
        renderer.setFillColor(Color.RED);
        for (let i = 0; i < this.targetPath.length - 1; i++) {
            const p1 = this.targetPath[i];
            assert(p1);
            renderer.fillCircle(p1.x, p1.y, 2);
            const p2 = this.targetPath[i + 1];
            assert(p2);
            renderer.strokeLine(p1.x, p1.y, p2.x, p2.y, 1);
        }
    }
}
