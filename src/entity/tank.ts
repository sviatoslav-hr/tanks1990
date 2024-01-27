import { Color } from "../color";
import { Context } from "../context";
import { Game } from "../game";
import { Keyboard } from "../keyboard";
import { Rect, distanceV2, randomFrom, rotateRect, xn, yn } from "../math";
import { None, Opt, Some } from "../option";
import { BlockOpts } from "./block";
import {
    Direction,
    Entity,
    clampByBoundary,
    isIntesecting,
    moveEntity,
    scaleMovement,
} from "./core";
import { Projectile } from "./projectile";
import { Sprite, createTankSprite } from "./sprite";

export abstract class Tank implements Entity {
    public x = 0;
    public y = 0;
    public width = Tank.SIZE;
    public height = Tank.SIZE;
    public showBoundary = false;
    public dead = true;
    public hasShield = true;
    public projectiles: Projectile[] = [];
    public readonly bot: boolean = true;
    protected dx = 0;
    protected dy = 0;
    protected v: number = 0;
    protected direction = Direction.UP;
    protected shootingDelayMs = 0;
    protected shieldRemainingMs = 0;
    protected moving = false;
    protected readonly SHOOTING_PERIOD_MS: number = 300;
    protected readonly MOVEMENT_SPEED: number = 100;
    protected readonly SHIELD_TIME_MS: number = 1000;
    protected abstract readonly sprite: Sprite<string>;
    protected index = Tank.index++;
    static SIZE = 50;
    private static index = 0;

    constructor(
        protected boundary: Rect,
        protected game: Game,
    ) {
        this.x = -(2 * this.width);
        this.y = -(2 * this.height);
    }

    get collided(): boolean {
        return this.game.tanks.some((t) => {
            return t !== this && !t.dead && isIntesecting(this, t);
        });
    }

    update(dt: number): void {
        if (this.dead) return;
        this.shootingDelayMs = Math.max(0, this.shootingDelayMs - dt);
        const prevX = this.x;
        const prevY = this.y;
        if (this.moving) {
            this.sprite.update(dt);
        }
        moveEntity(this, scaleMovement(this.v, dt), this.direction);
        if (this.collided) {
            this.handleCollision();
            this.x = prevX;
            this.y = prevY;
        }
        clampByBoundary(this, this.boundary);
        this.updateProjectiles(dt);
        this.updateShield(dt);
    }

    draw(ctx: Context): void {
        if (this.dead) return;
        this.sprite.draw(ctx, this, this.direction);
        for (const projectile of this.projectiles) {
            if (!projectile.dead) {
                projectile.draw(ctx);
            }
        }
        if (this.hasShield) {
            ctx.setStrokeColor(Color.WHITE);
            ctx.drawBoundary(this, 2);
        }
        if (this.showBoundary) {
            ctx.setStrokeColor(Color.PINK);
            ctx.drawBoundary(this, 1);
            ctx.setFont("400 16px Helvetica", "center", "middle");
            ctx.setFillColor(Color.WHITE);
            ctx.drawText(
                `${this.index}: {${Math.floor(this.x)};${Math.floor(this.y)}}`,
                this.x + this.width / 2,
                this.y - this.height / 2,
            );
        }
    }

    shoot(): void {
        if (this.shootingDelayMs > 0) return;
        this.shootingDelayMs = this.SHOOTING_PERIOD_MS;
        const [px, py] = this.getProjectileStartPos();
        const deadProjectile = this.projectiles.find((p) => p.dead);
        if (deadProjectile) {
            // NOTE: reuse dead projectiles instead of creating new ones
            deadProjectile.reviveAt(px, py);
            return;
        }
        const size = Tank.SIZE * 0.08;
        this.projectiles.push(
            new Projectile(
                px - size / 2,
                py - size / 2,
                size,
                this.game,
                this,
                this.boundary,
                this.direction,
            ),
        );
    }

    respawn(): void {
        this.tryRespawn(4);
    }

    doDamage(other: Tank): boolean {
        if (other.constructor === this.constructor) {
            return false;
        }
        return other.takeDamage();
    }

    takeDamage(): boolean {
        return (this.dead = !this.hasShield);
    }

    private tryRespawn(limit: number): void {
        if (limit <= 0) return;
        switch (randomFrom(0, 1, 2, 3)) {
            case 0: {
                this.x = 0;
                this.y = 0;
                break;
            }
            case 1: {
                this.x = xn(this.boundary) - this.width;
                this.y = 0;
                break;
            }
            case 2: {
                this.x = xn(this.boundary) - this.width;
                this.y = yn(this.boundary) - this.height;
                break;
            }
            case 3: {
                this.x = 0;
                this.y = yn(this.boundary) - this.height;
                break;
            }
        }
        if (this.collided) {
            this.tryRespawn(limit - 1);
        } else {
            this.dead = false;
            this.shootingDelayMs = this.SHOOTING_PERIOD_MS;
            this.activateShield();
        }
    }

    activateShield(): void {
        this.hasShield = true;
        this.shieldRemainingMs = this.SHIELD_TIME_MS;
    }

    protected updateShield(dt: number): void {
        if (this.shieldRemainingMs || this.hasShield) {
            this.shieldRemainingMs = Math.max(0, this.shieldRemainingMs - dt);
            if (!this.shieldRemainingMs) {
                this.hasShield = false;
            }
        }
    }

    protected handleCollision(): void {}

    private updateProjectiles(dt: number): void {
        const garbageIndexes: number[] = [];
        for (const [index, projectile] of this.projectiles.entries()) {
            projectile.update(dt);
            if (projectile.dead) {
                garbageIndexes.push(index);
            }
        }
        this.projectiles = this.projectiles.filter(
            (_, i) => !garbageIndexes.includes(i),
        );
    }

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
}

export class PlayerTank extends Tank implements Entity {
    public readonly bot: boolean = false;
    public dead = true;
    public score = 0;
    public survivedMs = 0;
    protected readonly MOVEMENT_SPEED: number = 300;
    protected readonly sprite = createTankSprite("tank_yellow");

    constructor(boundary: Rect, game: Game) {
        super(boundary, game);
        this.x = 0;
        this.y = 0;
    }

    update(dt: number): void {
        if (this.dead) return;
        this.handleKeyboard();
        super.update(dt);
        this.survivedMs += dt;
    }

    respawn(): void {
        super.respawn();
        this.shootingDelayMs = 0;
        this.score = 0;
        this.survivedMs = 0;
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
        if (Keyboard.pressed.KeyA) {
            this.direction = Direction.LEFT;
            this.moving = true;
        }
        if (Keyboard.pressed.KeyD) {
            this.direction = Direction.RIGHT;
            this.moving = true;
        }
        if (Keyboard.pressed.KeyW) {
            this.direction = Direction.UP;
            this.moving = true;
        }
        if (Keyboard.pressed.KeyS) {
            this.direction = Direction.DOWN;
            this.moving = true;
        }
        if (Keyboard.pressed.Space && !this.shootingDelayMs) {
            this.shoot();
        }
        this.v = this.moving ? this.MOVEMENT_SPEED : 0;
    }
}

export class EnemyTank extends Tank implements Entity {
    protected direction = Direction.RIGHT;
    protected v = this.MOVEMENT_SPEED;
    protected moving = true;
    protected readonly SHOOTING_PERIOD_MS = 1000;
    protected readonly sprite = createTankSprite("tank_green");
    private readonly DIRECTION_CHANGE_MS = 2000;
    private randomDirectionDelay = this.DIRECTION_CHANGE_MS;
    private targetDirectionDelay = this.DIRECTION_CHANGE_MS;

    update(dt: number): void {
        const player = this.game.player;
        const dir = this.findDirectionTowards(player, dt).orElse(() =>
            this.findDirectionIfStuck().orElse(() =>
                this.findRandomDirection(dt),
            ),
        );
        if (dir.isSome()) this.direction = dir.val;
        super.update(dt);
        this.shoot();
    }

    respawn(): void {
        super.respawn();
    }

    protected handleCollision(): void {
        const dir = this.findRandomDirection(0, true);
        if (dir.isSome()) this.direction = dir.val;
    }

    private findDirectionIfStuck(): Opt<Direction> {
        if (this.y === 0 && xn(this) >= xn(this.boundary)) {
            return Some(Direction.DOWN);
        }
        if (yn(this) >= yn(this.boundary) && this.x === 0) {
            return Some(Direction.UP);
        }
        if (xn(this) >= xn(this.boundary) && yn(this) >= yn(this.boundary)) {
            return Some(Direction.LEFT);
        }
        if (this.x === 0 && this.y === 0) {
            return Some(Direction.RIGHT);
        }
        if (this.y === 0 && this.direction === Direction.UP) {
            return Some(Direction.DOWN);
        }
        if (
            yn(this) >= yn(this.boundary) &&
            this.direction === Direction.DOWN
        ) {
            return Some(Direction.UP);
        }
        if (
            xn(this) >= xn(this.boundary) &&
            this.direction === Direction.RIGHT
        ) {
            return Some(Direction.LEFT);
        }
        if (this.x === 0 && this.direction === Direction.LEFT) {
            return Some(Direction.RIGHT);
        }
        return None();
    }

    private findRandomDirection(dt: number, force = false): Opt<Direction> {
        this.randomDirectionDelay = Math.max(0, this.randomDirectionDelay - dt);
        if (this.randomDirectionDelay && !force) return None();
        if (Math.random() > 0.1) {
            this.randomDirectionDelay = this.DIRECTION_CHANGE_MS;
            return Some(
                randomFrom(
                    Direction.UP,
                    Direction.RIGHT,
                    Direction.DOWN,
                    Direction.LEFT,
                ),
            );
        }
        this.randomDirectionDelay = this.DIRECTION_CHANGE_MS;
        return None();
    }

    private findDirectionTowards(entity: Entity, dt: number): Opt<Direction> {
        if (entity.dead) return None();
        const entityDist = distanceV2(this, entity);
        if (entityDist < Tank.SIZE * 5) return None();
        this.targetDirectionDelay = Math.max(0, this.targetDirectionDelay - dt);
        if (this.targetDirectionDelay) {
            return None();
        }
        this.targetDirectionDelay = this.DIRECTION_CHANGE_MS;
        const dx = this.x - entity.x;
        const dy = this.y - entity.y;
        const dirY = dy > 0 ? Direction.UP : Direction.DOWN;
        const dirX = dx > 0 ? Direction.LEFT : Direction.RIGHT;
        // NOTE: move along the longer side first
        if (Math.abs(dx) > Math.abs(dy)) {
            if (Math.abs(dx) < this.width / 50) {
                return Some(dirY);
            }
            return Some(dirX);
        }
        if (Math.abs(dy) < this.height / 50) {
            return Some(dirX);
        }
        return Some(dirY);
    }
}
