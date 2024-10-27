import { Color } from '../color';
import { CELL_SIZE } from '../const';
import { Context } from '../context';
import { keyboard } from '../keyboard';
import {
    Rect,
    distanceV2,
    moveToRandomCorner,
    oppositeDirection,
    randomFrom,
    xn,
    yn,
} from '../math';
import { Duration } from '../math/duration.ts';
import { SoundType, playSound } from '../sound';
import { World } from '../world.ts';
import { Block } from './block';
import {
    Direction,
    Entity,
    clampByBoundary,
    getMovement,
    isIntesecting,
    isOutsideRect,
    moveEntity,
    scaleMovement,
} from './core';
import { ExplosionEffect } from './effect';
import { Projectile } from './projectile.ts';
import { Sprite, createShieldSprite, createTankSprite } from './sprite';

export abstract class Tank implements Entity {
    public x = 0;
    public y = 0;
    public width = CELL_SIZE - 8;
    public height = CELL_SIZE - 8;
    public showBoundary = false;
    public dead = false;
    public hasShield = true;
    public direction = Direction.UP;
    public readonly bot: boolean = true;

    protected dx = 0;
    protected dy = 0;
    protected v: number = 0;
    protected shieldRemaining = Duration.zero();
    protected moving = false;
    protected isExplosionExpected = false;
    protected explosionEffect?: ExplosionEffect | null;
    protected readonly SHOOTING_PERIOD = Duration.milliseconds(300);
    protected readonly MOVEMENT_SPEED = Duration.milliseconds(80);
    protected readonly SHIELD_TIME = Duration.milliseconds(1000);
    protected readonly shieldSprite = createShieldSprite();
    protected abstract readonly sprite: Sprite<string>;
    protected index = Tank.index++;
    protected shootingDelay = this.SHOOTING_PERIOD.clone();

    private static index = 0;

    constructor(
        protected boundary: Rect,
        protected world: World,
    ) {
        // NOTE: spawn outside of the screen, expected to respawn
        this.x = -(2 * this.width);
        this.y = -(2 * this.height);
    }

    get isExplosionFinished(): boolean {
        if (this.isExplosionExpected) return false;
        if (!this.explosionEffect) return true;
        return this.explosionEffect.isAnimationFinished;
    }

    update(dt: Duration): void {
        this.shieldSprite.update(dt);
        if (this.explosionEffect) {
            if (this.explosionEffect.isAnimationFinished) {
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
        if (this.world.isInfinite && this instanceof PlayerTank) {
            const movement = getMovement(
                scaleMovement(this.v, dt),
                this.direction,
            );
            this.world.moveWorld(movement);
        } else {
            moveEntity(this, scaleMovement(this.v, dt), this.direction);
        }
        const collided = this.findCollided();
        if (collided) {
            if (collided instanceof Tank) {
                this.handleCollision(collided);
            }
            this.x = prevX;
            this.y = prevY;
        }
        if (!this.world.isInfinite) {
            clampByBoundary(this, this.boundary);
        }
        this.updateShield(dt);
    }

    draw(ctx: Context): void {
        this.explosionEffect?.draw(ctx);
        if (this.isExplosionExpected && !this.explosionEffect) {
            this.isExplosionExpected = false;
            this.sprite.draw(ctx, this, this.direction);
            const particleSize = Math.floor(this.width / 16); // NOTE: 16 is single px in image
            this.explosionEffect = ExplosionEffect.fromImageData(
                ctx.ctx.getImageData(this.x, this.y, this.width, this.height),
                this,
                particleSize,
            );
            this.explosionEffect?.draw(ctx);
            return;
        }
        if (this.dead) return;
        this.sprite.draw(ctx, this, this.direction);
        if (this.hasShield) {
            this.shieldSprite.draw(ctx, this);
        }
        if (this.showBoundary) {
            ctx.setStrokeColor(Color.PINK);
            ctx.drawBoundary(this, 1);
            ctx.setFont('400 16px Helvetica', 'center', 'middle');
            ctx.setFillColor(Color.WHITE);
            ctx.drawText(
                `${this.index}: {${Math.floor(this.x)};${Math.floor(this.y)}}`,
                {
                    x: this.x + this.width / 2,
                    y: this.y - this.height / 2,
                },
            );
        }
    }

    shoot(): void {
        if (this.shootingDelay.positive) return;
        this.shootingDelay.setFrom(this.SHOOTING_PERIOD);
        if (!this.world.player.dead) {
            const volumeScale = this.bot ? 0.15 : 1;
            playSound(SoundType.SHOOTING, volumeScale);
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
            this.x = this.boundary.x + this.boundary.width / 2 - this.width / 2;
            this.y =
                this.boundary.y + this.boundary.height / 2 - this.height / 2;
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
            playSound(SoundType.EXPLOSION);
        }
        return dead;
    }

    private tryRespawn(limit: number): boolean {
        if (limit <= 0) return false;
        moveToRandomCorner(this, this.boundary);
        if (this.findCollided()) {
            return this.tryRespawn(limit - 1);
        }
        return true;
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

    protected handleCollision(_target: Tank): void {}

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
        const tank = this.world.tanks.find((t) => {
            return t !== this && !t.dead && isIntesecting(this, t);
        });
        if (tank) return tank;
        return this.world.blocks.find((b) => isIntesecting(this, b));
    }
}

export class PlayerTank extends Tank implements Entity {
    public readonly bot: boolean = false;
    public dead = true;
    public score = 0;
    public survivedFor = Duration.zero();
    protected readonly MOVEMENT_SPEED = Duration.milliseconds(160);
    protected readonly sprite = createTankSprite('tank_yellow');

    constructor(boundary: Rect, world: World) {
        super(boundary, world);
        if (world.isInfinite) {
            this.x = boundary.x + boundary.width / 2;
            this.y = boundary.y + boundary.height / 2;
        } else {
            this.x = 0;
            this.y = 0;
        }
    }

    update(dt: Duration): void {
        super.update(dt);
        if (this.dead) return;
        this.handleKeyboard();
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
        if (keyboard.isDown('KeyA')) {
            this.direction = Direction.LEFT;
            this.moving = true;
        }
        if (keyboard.isDown('KeyD')) {
            this.direction = Direction.RIGHT;
            this.moving = true;
        }
        if (keyboard.isDown('KeyW')) {
            this.direction = Direction.UP;
            this.moving = true;
        }
        if (keyboard.isDown('KeyS')) {
            this.direction = Direction.DOWN;
            this.moving = true;
        }
        if (keyboard.isDown('Space') && !this.shootingDelay.positive) {
            this.shoot();
        }
        this.v = this.moving ? this.MOVEMENT_SPEED.milliseconds : 0;
    }
}

export class EnemyTank extends Tank implements Entity {
    protected v = this.MOVEMENT_SPEED.milliseconds;
    protected moving = true;
    protected readonly SHOOTING_PERIOD = Duration.milliseconds(1000);
    protected readonly sprite = createTankSprite('tank_green');
    private readonly DIRECTION_CHANGE = Duration.milliseconds(2000);
    private randomDirectionDelay = this.DIRECTION_CHANGE.clone();
    private targetDirectionDelay = this.DIRECTION_CHANGE.clone();
    private collided = false;

    update(dt: Duration): void {
        const player = this.world.player;
        // NOTE: is collided, don't change the direction, allowing entities to move away from each other
        if (!this.collided) {
            const dir =
                this.findPlayerDirection(player, dt) ??
                this.findDirectionIfStuck() ??
                this.findRandomDirection(dt);
            if (dir != null) this.direction = dir;
        }
        this.collided = false;
        super.update(dt);
        this.shoot();
    }

    respawn(): void {
        super.respawn();
    }

    protected handleCollision(target: Tank): void {
        this.collided = true;
        if (target instanceof EnemyTank) {
            target.collided = true;
            const dir = this.findDirectionTowards(target);
            if (dir != null) {
                this.direction = oppositeDirection(dir);
                target.direction = dir;
            }
        }
    }

    private findDirectionIfStuck(): Direction | null {
        if (this.y === 0 && xn(this) >= xn(this.boundary)) {
            return Direction.DOWN;
        }
        if (yn(this) >= yn(this.boundary) && this.x === 0) {
            return Direction.UP;
        }
        if (xn(this) >= xn(this.boundary) && yn(this) >= yn(this.boundary)) {
            return Direction.LEFT;
        }
        if (this.x === 0 && this.y === 0) {
            return Direction.RIGHT;
        }
        if (this.y === 0 && this.direction === Direction.UP) {
            return Direction.DOWN;
        }
        if (
            yn(this) >= yn(this.boundary) &&
            this.direction === Direction.DOWN
        ) {
            return Direction.UP;
        }
        if (
            xn(this) >= xn(this.boundary) &&
            this.direction === Direction.RIGHT
        ) {
            return Direction.LEFT;
        }
        if (this.x === 0 && this.direction === Direction.LEFT) {
            return Direction.RIGHT;
        }
        return null;
    }

    private findRandomDirection(dt: Duration, force = false): Direction | null {
        this.randomDirectionDelay.sub(dt).max(0);
        if (this.randomDirectionDelay && !force) return null;
        if (Math.random() > 0.1) {
            this.randomDirectionDelay.setFrom(this.DIRECTION_CHANGE);
            return randomFrom(
                Direction.UP,
                Direction.RIGHT,
                Direction.DOWN,
                Direction.LEFT,
            );
        }
        this.randomDirectionDelay.setFrom(this.DIRECTION_CHANGE);
        return null;
    }

    private findPlayerDirection(
        player: Entity,
        dt: Duration,
    ): Direction | null {
        const dir = this.findDirectionTowards(player);
        if (dir == null) return dir;

        // NOTE: if enemy is outside of screen, always move it towards player
        const isOutside = !isOutsideRect(player, this.boundary);
        if (isOutside && distanceV2(this, player) < CELL_SIZE * 5) return null;

        this.targetDirectionDelay.sub(dt).max(0);
        if (this.targetDirectionDelay.positive) return null;
        this.targetDirectionDelay.setFrom(this.DIRECTION_CHANGE);
        return dir;
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
}
