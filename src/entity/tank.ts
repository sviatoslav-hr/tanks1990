import { Color } from "../color";
import { Context } from "../context";
import { Keyboard } from "../keyboard";
import { Rect, randomFrom, rotateRect, xn, yn } from "../math";
import { State } from "../state";
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

type TankColorSpecs = {
    track: Color;
    body: Color;
    turret: Color;
    gun: Color;
};

const tankColors: Record<"orange" | "green", TankColorSpecs> = {
    orange: {
        track: Color.ORANGE_GAMBOGE,
        body: Color.ORANGE_GAMBOGE,
        turret: Color.ORANGE_SAFFRON,
        gun: Color.WHITE_NAVAJO,
    },
    green: {
        track: Color.GREEN_DARK,
        body: Color.GREEN_DARK,
        turret: Color.GREEN_DEEP,
        gun: Color.GREEN_NT,
    },
};

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
    protected readonly SHOOTING_PERIOD_MS: number = 300;
    protected readonly MOVEMENT_SPEED: number = 100;
    protected readonly SHIELD_TIME_MS: number = 1000;
    protected readonly colors = tankColors.orange;
    protected index = Tank.index++;
    static SIZE = 50;
    private static index = 0;

    constructor(protected boundary: Rect) {
        this.x = -(2 * this.width);
        this.y = -(2 * this.height);
    }

    get collided(): boolean {
        return State.tanks.some((t) => {
            return t !== this && !t.dead && isIntesecting(this, t);
        });
    }

    update(dt: number): void {
        if (this.dead) return;
        this.shootingDelayMs = Math.max(0, this.shootingDelayMs - dt);
        const prevX = this.x;
        const prevY = this.y;
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
        for (const block of this.createModel()) {
            ctx.setFillColor(block.color);
            const rotated = rotateRect(
                block,
                this.width / 2,
                this.height / 2,
                this.direction,
            );
            ctx.drawRect(
                this.x + rotated.x,
                this.y + rotated.y,
                rotated.width,
                rotated.height,
            );
        }
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
        const [px, py] = this.getProjectilePos();
        const size = Tank.SIZE * 0.08;
        this.projectiles.push(
            new Projectile(
                px - size / 2,
                py - size / 2,
                size,
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

    private createModel(): BlockOpts[] {
        const blocks: BlockOpts[] = [];
        const trackWidth = this.width * 0.25;
        const trackHeight = this.height * 0.75;
        const bodyHeight = trackHeight * 0.8;
        const headSize = bodyHeight * 0.7;
        const trackYOffset = this.height - trackHeight;
        blocks.push({
            x: 0,
            y: trackYOffset,
            width: trackWidth,
            height: trackHeight,
            color: this.colors.track,
        });
        blocks.push({
            x: 3 * trackWidth,
            y: trackYOffset,
            width: trackWidth,
            height: trackHeight,
            color: this.colors.track,
        });
        const bodyYOffset = trackYOffset + (trackHeight - bodyHeight) / 2;
        blocks.push({
            x: 0,
            y: bodyYOffset,
            width: this.width,
            height: bodyHeight,
            color: this.colors.body,
        });
        const turretYOffset = bodyYOffset + (bodyHeight - headSize) / 2;
        blocks.push({
            x: trackWidth,
            y: turretYOffset,
            width: this.width - 2 * trackWidth,
            height: headSize,
            color: this.colors.turret,
        });
        const gunWidth = this.width / 15;
        blocks.push({
            x: (this.width - gunWidth) / 2,
            y: 0,
            width: gunWidth,
            height: turretYOffset,
            color: this.colors.gun,
        });
        return blocks;
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

    private getProjectilePos(): [number, number] {
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
    public dead = false;
    public score = 0;
    public survivedMs = 0;
    protected readonly MOVEMENT_SPEED: number = 300;

    constructor(boundary: Rect) {
        super(boundary);
        this.dead = false;
        this.x = 0;
        this.y = 0;
    }

    update(dt: number): void {
        if (!this.dead) {
            this.handleKeyboard();
        }
        super.update(dt);
        if (!this.dead) {
            this.survivedMs += dt;
        }
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
        let isMoving = false;
        if (Keyboard.pressed.KeyA) {
            this.direction = Direction.LEFT;
            isMoving = true;
        }
        if (Keyboard.pressed.KeyD) {
            isMoving = true;
            this.direction = Direction.RIGHT;
        }
        if (Keyboard.pressed.KeyW) {
            this.direction = Direction.UP;
            isMoving = true;
        }
        if (Keyboard.pressed.KeyS) {
            this.direction = Direction.DOWN;
            isMoving = true;
        }
        if (Keyboard.pressed.Space && !this.shootingDelayMs) {
            this.shoot();
        }
        this.v = isMoving ? this.MOVEMENT_SPEED : 0;
    }
}

export class EnemyTank extends Tank implements Entity {
    protected colors: TankColorSpecs = tankColors.green;
    protected direction = Direction.RIGHT;
    protected v = this.MOVEMENT_SPEED;
    protected readonly SHOOTING_PERIOD_MS = 1000;
    private readonly DIRECTION_CHANGE_MS = 5000;
    private directionChangeDelay = this.DIRECTION_CHANGE_MS;

    update(dt: number): void {
        let dir = this.findDirectionIfStuck();
        if (dir == null) dir = this.findRandomDirection(dt);
        if (dir != null) this.direction = dir;
        super.update(dt);
        this.shoot();
    }

    respawn(): void {
        super.respawn();
    }

    protected handleCollision(): void {
        const dir = this.findRandomDirection(0, true);
        if (dir != null) this.direction = dir;
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

    private findRandomDirection(dt: number, force = false): Direction | null {
        this.directionChangeDelay = Math.max(0, this.directionChangeDelay - dt);
        if (this.directionChangeDelay && !force) return null;
        if (Math.random() > 0.1) {
            this.directionChangeDelay = this.DIRECTION_CHANGE_MS;
            return randomFrom(
                Direction.UP,
                Direction.RIGHT,
                Direction.DOWN,
                Direction.LEFT,
            );
        }
        this.directionChangeDelay = this.DIRECTION_CHANGE_MS;
        return null;
    }
}
