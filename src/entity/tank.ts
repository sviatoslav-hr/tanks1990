import { Color } from "../color";
import { Context } from "../context";
import { Keyboard } from "../keyboard";
import { Rect, clamp, rotateRect } from "../math";
import { BlockOpts } from "./block";
import { Direction, Entity } from "./core";
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
    public width = 100;
    public height = 100;
    public showBoundary = false;
    public dead = false;
    protected dx = 0;
    protected dy = 0;
    protected direction = Direction.UP;
    protected shootingDelay = 0;
    protected projectiles: Projectile[] = [];
    protected readonly v: number = 5;
    protected readonly SHOOTING_DELAY_MS: number = 300;
    protected readonly colors = tankColors.orange;

    constructor(protected boundary: Rect) {}

    update(dt: number): void {
        if (this.dead) return;
        this.shootingDelay = Math.max(0, this.shootingDelay - dt);
        this.x += this.dx;
        this.y += this.dy;
        this.x = clamp(
            this.x,
            this.boundary.x,
            this.boundary.x + this.boundary.width - this.width,
        );
        this.y = clamp(
            this.y,
            this.boundary.y,
            this.boundary.y + this.boundary.height - this.height,
        );
        this.updateProjectiles(dt);
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
        if (this.showBoundary) {
            ctx.setStrokeColor(Color.RED);
            ctx.drawBoundary(this);
        }
        for (const projectile of this.projectiles) {
            if (!projectile.dead) {
                projectile.draw(ctx);
            }
        }
    }

    shoot(): void {
        if (this.shootingDelay > 0) return;
        this.shootingDelay = this.SHOOTING_DELAY_MS;
        const [px, py] = this.getProjectilePos();
        this.projectiles.push(
            new Projectile(
                px - Projectile.SIZE / 2,
                py - Projectile.SIZE / 2,
                this.boundary,
                this.direction,
            ),
        );
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
    update(dt: number): void {
        this.dy = 0;
        this.dx = 0;
        this.handleKeyboard();
        super.update(dt);
    }

    protected handleKeyboard(): void {
        if (Keyboard.pressed.KeyA) {
            this.dx = -this.v;
            this.dy = 0;
            this.direction = Direction.LEFT;
        }
        if (Keyboard.pressed.KeyD) {
            this.dx = this.v;
            this.dy = 0;
            this.direction = Direction.RIGHT;
        }
        if (Keyboard.pressed.KeyW) {
            this.dy = -this.v;
            this.dx = 0;
            this.direction = Direction.UP;
        }
        if (Keyboard.pressed.KeyS) {
            this.dy = this.v;
            this.dx = 0;
            this.direction = Direction.DOWN;
        }
        if (Keyboard.pressed.Space && !this.shootingDelay) {
            this.shoot();
        }
    }
}

export class EnemyTank extends Tank implements Entity {
    protected colors: TankColorSpecs = tankColors.green;
    protected direction = Direction.RIGHT;
    protected readonly SHOOTING_DELAY_MS = 1000;

    update(dt: number): void {
        this.dx = 1;
        super.update(dt);
        this.shoot();
    }
}
