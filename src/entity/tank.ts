import {Animation} from '#/animation';
import {Camera} from '#/camera';
import {Color} from '#/color';
import {CELL_SIZE} from '#/const';
import {Context} from '#/context';
import {Block} from '#/entity/block';
import {
    Direction,
    Entity,
    clampByBoundary,
    isIntesecting,
    moveEntity,
} from '#/entity/core';
import {ExplosionEffect} from '#/entity/effect';
import {Projectile} from '#/entity/projectile';
import {Sprite, createShieldSprite, createTankSprite} from '#/entity/sprite';
import {GameInput} from '#/game-input';
import {
    GRAVITY,
    isPosInsideRect,
    moveToRandomCorner,
    oppositeDirection,
} from '#/math';
import {Duration} from '#/math/duration';
import {Vector2, Vector2Like} from '#/math/vector';
import {SoundType, SoundManager} from '#/sound';
import {World} from '#/world';
import {findPath} from './pathfinding';

export abstract class Tank implements Entity {
    public x = 0;
    public y = 0;
    public width = CELL_SIZE - 8;
    public height = CELL_SIZE - 8;
    public dead = false;
    public hasShield = true;
    public direction = Direction.UP;
    // TODO: Is this really a good idea to have this field here?
    public readonly bot: boolean = true;
    public readonly topSpeed = (480 * 1000) / 3600; // in m/s
    public readonly topSpeedReachTime = Duration.milliseconds(150);
    public readonly frictionCoef = 0.8; // rolling friction, 0.8 is a value for asphalt
    public readonly index = Tank.index++;

    protected velocity: number = 0;
    protected acceleration = 0;
    protected shieldRemaining = Duration.zero();
    protected moving = false;
    protected isExplosionExpected = false;
    protected explosionEffect?: ExplosionEffect | null;
    protected readonly SHOOTING_PERIOD = Duration.milliseconds(300);
    protected readonly SHIELD_TIME = Duration.milliseconds(1000);
    protected readonly shieldSprite = createShieldSprite();
    protected abstract readonly sprite: Sprite<string>;
    protected shootingDelay = this.SHOOTING_PERIOD.clone();
    protected isStuck = false;

    private static index = 0;

    constructor(
        protected readonly world: World,
        protected readonly sounds: SoundManager,
    ) {
        // NOTE: spawn outside of the screen, expected to respawn
        this.x = -(2 * this.width);
        this.y = -(2 * this.height);
    }

    get cx(): number {
        return this.x + this.width / 2;
    }

    get cy(): number {
        return this.y + this.height / 2;
    }

    get isExplosionFinished(): boolean {
        if (this.isExplosionExpected) return false;
        if (!this.explosionEffect) return true;
        return this.explosionEffect.animation.finished;
    }

    get deceleration(): number {
        // NOTE: simulate friction with increasing speed (air resistance, etc.)
        const simulatedFriction = this.world.frictionCoef * this.velocity;
        return (
            this.frictionCoef * GRAVITY * this.world.gravityCoef +
            simulatedFriction
        );
    }

    update(dt: Duration, _camera: Camera): void {
        this.shieldSprite.update(dt);
        if (this.explosionEffect) {
            if (this.explosionEffect.animation.finished) {
                this.explosionEffect = null;
            } else {
                assert(
                    this.dead,
                    'Explosion effect should only be used for dead entities',
                );
                this.explosionEffect.update(dt);
            }
        }
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
            let totalAcceleration = this.acceleration;
            if (this.velocity > 0) {
                totalAcceleration -= this.deceleration;
                this.isStuck = false;
            }
            const dtSeconds = dt.seconds;
            // p' = 1/2*a*dt^2 + v*dt + p   ==>    dp = p'-p = 1/2*a*dt^2 + v*dt
            const movementOffset =
                0.5 * totalAcceleration * dtSeconds * dtSeconds +
                this.velocity * dtSeconds;
            // v' = a*dt + v
            const newVelocity = this.velocity + totalAcceleration * dtSeconds;
            this.velocity = Math.min(Math.max(0, newVelocity), this.topSpeed);
            assert(this.velocity >= 0);
            moveEntity(this, movementOffset, this.direction);
        }
        const collided = this.findCollided();
        if (collided) {
            this.handleCollision(collided);
            this.x = prevX;
            this.y = prevY;
            this.stopMoving();
            this.isStuck = true;
        }
        if (!this.world.isInfinite) {
            const oldX = this.x;
            const oldY = this.y;
            clampByBoundary(this, this.world.boundary);
            if (oldX !== this.x || oldY !== this.y) {
                this.stopMoving();
                this.isStuck = true;
            }
        }
        this.updateShield(dt);
    }

    startMoving(): void {
        // NOTE: acceleration here is assumed without friction
        // v=u+a*t => a=(v-u)/t
        this.acceleration =
            this.topSpeed / this.topSpeedReachTime.seconds + this.deceleration;
    }

    stopMoving(): void {
        this.velocity = 0;
        this.acceleration = 0;
    }

    draw(ctx: Context, camera: Camera): void {
        this.explosionEffect?.draw(ctx, camera);
        if (this.isExplosionExpected && !this.explosionEffect) {
            this.isExplosionExpected = false;
            this.sprite.draw(ctx, this, camera, this.direction);
            const particleSize = Math.floor(this.width / 16); // NOTE: 16 is single px in image
            this.explosionEffect = ExplosionEffect.fromImageData(
                ctx.ctx.getImageData(
                    this.x - camera.position.x,
                    this.y - camera.position.y,
                    this.width,
                    this.height,
                ),
                this,
                particleSize,
            );
            this.explosionEffect.draw(ctx, camera);
            return;
        }

        if (this.dead) return;
        this.sprite.draw(ctx, this, camera, this.direction);
        if (this.hasShield) {
            this.shieldSprite.draw(ctx, this, camera);
        }

        if (this.world.showBoundary) {
            ctx.setStrokeColor(Color.PINK);
            ctx.drawBoundary(this, 1, camera);
            ctx.setFont('400 16px Helvetica', 'center', 'middle');
            ctx.setFillColor(Color.WHITE);
            // const velocity = ((this.velocity * 3600) / 1000).toFixed(2);
            ctx.drawText(
                // `${this.index}: {a=${this.acceleration.toFixed(2)};v=${velocity}km/h`,
                `${this.index}: {${Math.floor(this.x)};${Math.floor(this.y)}}`,
                {
                    x: this.x - camera.position.x + this.width / 2,
                    y: this.y - camera.position.y - this.height / 2,
                },
            );
        }
        if (this.world.showBoundary && this.isStuck) {
            ctx.setStrokeColor(Color.RED);
            ctx.drawBoundary(this, 1, camera);
        }
    }

    shoot(): void {
        if (this.shootingDelay.positive) return;
        this.shootingDelay.setFrom(this.SHOOTING_PERIOD);
        if (!this.world.player.dead) {
            const volumeScale = this.bot ? 0.15 : 1;
            this.sounds.playSound(SoundType.SHOOTING, volumeScale);
        }
        const [px, py] = this.getProjectileStartPos();
        Projectile.spawn(this, this.world, px, py, this.direction);
    }

    respawn(): void {
        if (!this.bot) {
            this.explosionEffect = null;
            this.isExplosionExpected = false;
        }
        assert(
            this.isExplosionFinished,
            'Cannot respawn while explosion is in progress',
        );
        const playerInInfinite =
            this.world.isInfinite && this instanceof PlayerTank;
        if (playerInInfinite) {
            // NOTE: in infinite mode, player is always in the center
            const boundary = this.world.boundary;
            this.x = boundary.x + boundary.width / 2 - this.width / 2;
            this.y = boundary.y + boundary.height / 2 - this.height / 2;
        }
        if (playerInInfinite || this.tryRespawn(4)) {
            this.dead = false;
            this.shootingDelay.setFrom(this.SHOOTING_PERIOD);
            this.activateShield();
        }
    }

    doDamage(other: Tank): boolean {
        if (other.constructor === this.constructor) {
            return false;
        }
        return other.takeDamage();
    }

    takeDamage(): boolean {
        if (this.dead) {
            console.warn('WARN: Trying to kill a dead entity');
            return false;
        }
        const dead = !this.hasShield;
        if (dead) {
            this.dead = true;
            this.isExplosionExpected = true;
            this.sounds.playSound(SoundType.EXPLOSION);
        }
        return dead;
    }

    private tryRespawn(attemptLimit: number): boolean {
        assert(attemptLimit > 0, 'Limit should be greater than 0');
        for (let attempt = 0; attempt < attemptLimit; attempt++) {
            moveToRandomCorner(this, this.world.boundary);
            if (!this.findCollided()) return true;
        }
        return false;
    }

    activateShield(): void {
        this.hasShield = true;
        this.shieldRemaining.setFrom(this.SHIELD_TIME);
    }

    protected updateShield(dt: Duration): void {
        if (this.shieldRemaining.positive || this.hasShield) {
            this.shieldRemaining.sub(dt).max(0);
            if (!this.shieldRemaining.positive) {
                this.hasShield = false;
            }
        }
    }

    protected handleCollision(_target: Entity): void {}

    private getProjectileStartPos(): [number, number] {
        switch (this.direction) {
            case Direction.UP:
                return [this.x + this.width / 2, this.y];
            case Direction.RIGHT:
                return [this.x + this.width, this.y + this.height / 2];
            case Direction.DOWN:
                return [this.x + this.width / 2, this.y + this.height];
            case Direction.LEFT:
                return [this.x, this.y + this.height / 2];
        }
    }

    findCollided(): Tank | Block | undefined {
        if (this.dead) return;
        const tank = this.world.tanks.find((t) => {
            return !t.equals(this) && !t.dead && isIntesecting(this, t);
        });
        if (tank) return tank;
        return this.world.blocks.find((b) => isIntesecting(this, b));
    }

    equals(other: Tank): boolean {
        return this === other;
    }
}

export class PlayerTank extends Tank implements Entity {
    public readonly topSpeedReachTime = Duration.milliseconds(50); // in seconds
    public readonly bot: boolean = false;
    public dead = true;
    public score = 0;
    public survivedFor = Duration.zero();
    protected readonly sprite = createTankSprite('tank_yellow');

    constructor(
        world: World,
        sounds: SoundManager,
        private keyboard: GameInput,
    ) {
        super(world, sounds);
        if (world.isInfinite) {
            this.x = world.boundary.x + world.boundary.width / 2;
            this.y = world.boundary.y + world.boundary.height / 2;
        } else {
            this.x = 0;
            this.y = 0;
        }
    }

    update(dt: Duration, camera: Camera): void {
        this.handleKeyboard();
        super.update(dt, camera);
        if (this.dead) return;
        this.survivedFor.add(dt);
    }

    respawn(): void {
        super.respawn();
        this.shootingDelay.milliseconds = 0;
        this.score = 0;
        this.survivedFor.milliseconds = 0;
    }

    doDamage(other: Tank): boolean {
        const killed = super.doDamage(other);
        if (killed) {
            this.score += 1;
        }
        return killed;
    }

    protected handleKeyboard(): void {
        this.moving = false;
        let newDirection: Direction | null = null;
        const keyboard = this.keyboard;
        if (keyboard.isDown('KeyA')) {
            newDirection = Direction.LEFT;
        }
        if (keyboard.isDown('KeyD')) {
            if (newDirection === Direction.LEFT) {
                newDirection = null;
            } else {
                newDirection = Direction.RIGHT;
            }
        }
        if (keyboard.isDown('KeyW')) {
            newDirection = Direction.UP;
        }
        if (keyboard.isDown('KeyS')) {
            if (newDirection === Direction.UP) {
                newDirection = null;
            } else {
                newDirection = Direction.DOWN;
            }
        }
        if (keyboard.isDown('Space') && !this.shootingDelay.positive) {
            this.shoot();
        }
        if (newDirection == null) {
            this.acceleration = 0;
        } else {
            if (newDirection !== this.direction) {
                this.velocity = 0;
            }
            this.direction = newDirection;
            this.moving = true;
            this.startMoving();
        }
    }
}

export class EnemyTank extends Tank implements Entity {
    protected moving = true;
    protected readonly SHOOTING_PERIOD = Duration.milliseconds(1000);
    protected readonly sprite = createTankSprite('tank_green');
    private readonly DIRECTION_CHANGE = Duration.milliseconds(2000);
    private targetDirectionDelay = this.DIRECTION_CHANGE.clone();
    private path: Vector2[] = [];
    private collided = false;
    private readonly collisionAnimation = new Animation(
        Duration.milliseconds(1000),
    ).end();

    update(dt: Duration, camera: Camera): void {
        const player = this.world.player;
        // NOTE: is collided, don't change the direction, allowing entities to move away from each other
        if (this.collided) {
            this.velocity = 0;
        }
        if (!this.dead && !this.collided) {
            // TODO: if player is dead, choose a random direction
            let newDirection = player.dead
                ? null
                : this.findPlayerDirection(player, dt);
            if (newDirection != null && newDirection !== this.direction) {
                this.velocity = 0;
                this.direction = newDirection;
            }
            if (!this.velocity) {
                this.startMoving();
            }
        }
        this.collisionAnimation.update(dt);
        this.collided = false;
        super.update(dt, camera);
        if (camera.isEntityVisible(this)) {
            this.shoot();
        }
    }

    draw(ctx: Context, camera: Camera): void {
        if (this.world.showBoundary && !this.dead && !this.world.player.dead) {
            this.drawPath(ctx);
        }
        super.draw(ctx, camera);
        if (this.dead) return;
        if (this.world.showBoundary) {
            if (this.collisionAnimation.active) {
                ctx.setStrokeColor(Color.WHITE_NAVAJO);
                ctx.drawBoundary(
                    this,
                    this.collisionAnimation.progress * 10,
                    camera,
                );
            }
            if (this.isStuck) {
                ctx.setStrokeColor(Color.RED);
                ctx.drawBoundary(this, 1, camera);
            }
        }
    }

    respawn(): void {
        super.respawn();
        this.targetDirectionDelay.setMilliseconds(0);
    }

    protected override handleCollision(target: Entity): void {
        this.collided = true;
        this.collisionAnimation.reset();
        if (target instanceof EnemyTank) {
            target.collided = true;
            target.collisionAnimation.reset();
            const dir = this.findDirectionTowards(target);
            if (dir != null) {
                this.direction = oppositeDirection(dir);
                target.direction = dir;
            }
        }
    }

    private findPlayerDirection(
        player: Entity,
        dt: Duration,
    ): Direction | null {
        this.targetDirectionDelay.sub(dt).max(0);
        if (this.path.length && this.targetDirectionDelay.positive) {
            const nextPoint = this.path[0];
            if (nextPoint && this.isValidNextPoint(nextPoint)) {
                this.path.shift();
                return this.getDirectionToPoint(nextPoint);
            }
            return null;
        }
        this.targetDirectionDelay.setFrom(this.DIRECTION_CHANGE);

        const dir = this.findDirectionAndBuildPath(player);
        if (dir == null) return dir;
        return dir;
    }

    private findDirectionAndBuildPath(entity: Entity): Direction | null {
        const path = findPath(this, entity, this.world, 100);
        if (!path) return null;
        this.path = path;
        const next = this.path[0];
        assert(next);
        return this.getDirectionToPoint(next);
    }

    private isValidNextPoint(next: Vector2): boolean {
        if (!isPosInsideRect(next.x, next.y, this)) {
            return false;
        }
        // NOTE: Change direction only when the entity is alighned with the next point
        const cx = Math.floor(this.cx);
        if (cx === next.x) {
            return true;
        }
        const cy = Math.floor(this.cy);
        if (cy === next.y) {
            return true;
        }
        return false;
    }

    private getDirectionToPoint(next: Vector2Like): Direction | null {
        const dx = next.x - Math.floor(this.cx);
        if (dx !== 0) {
            return dx > 0 ? Direction.RIGHT : Direction.LEFT;
        }
        const dy = next.y - Math.floor(this.cy);
        if (dy !== 0) {
            return dy > 0 ? Direction.DOWN : Direction.UP;
        }
        return null;
    }

    private findDirectionTowards(entity: Entity): Direction | null {
        if (entity.dead) return null;
        const dx = this.x - entity.x;
        const dy = this.y - entity.y;
        const dirY = dy > 0 ? Direction.UP : Direction.DOWN;
        const dirX = dx > 0 ? Direction.LEFT : Direction.RIGHT;
        // NOTE: move along the longer side first
        if (Math.abs(dx) > Math.abs(dy)) {
            if (Math.abs(dx) < this.width / 50) {
                return dirY;
            }
            return dirX;
        }
        if (Math.abs(dy) < this.height / 50) {
            return dirX;
        }
        return dirY;
    }

    private drawPath(ctx: Context): void {
        if (this.path.length < 2) {
            console.warn('WARN: Path is too short to draw');
            return;
        }
        ctx.setStrokeColor(Color.RED);
        ctx.setFillColor(Color.RED);
        for (let i = 0; i < this.path.length - 1; i++) {
            const p1 = this.path[i];
            assert(p1);
            ctx.fillCircle(p1.x, p1.y, 2);
            const p2 = this.path[i + 1];
            assert(p2);
            ctx.drawLine(p1.x, p1.y, p2.x, p2.y, 1);
        }
    }
}
