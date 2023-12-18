import { Color } from "./color";
import { type Context } from "./context";
import { Keyboard } from "./keyboard";
import { type Rect, clamp, rotateRect } from "./math";

export enum Direction {
    UP = 0,
    RIGHT = 90,
    DOWN = 180,
    LEFT = 270,
}

export type Entity = {
    update(dt: number): void;
    draw(ctx: Context): void;
};

type BlockOpts = Rect & {
    color: Color;
};

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

export class Block implements Entity {
    public x = 0;
    public y = 0;
    public width = 50;
    public height = 50;
    private readonly color: Color = Color.WHITE;

    constructor({ x, y, width, height, color }: BlockOpts) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
    }

    update(_: number): void {}

    draw(ctx: Context): void {
        ctx.setFillColor(this.color);
        ctx.drawRect(this.x, this.y, this.width, this.height);
    }
}

export class Tank implements Entity {
    public x = 0;
    public y = 0;
    public width = 100;
    public height = 100;
    public showBoundary = false;
    private dx = 0;
    private dy = 0;
    private direction = Direction.UP;
    private shootingDelay = 0;
    private readonly v = 5;
    private readonly SHOOTING_DELAY_MS = 300;
    private readonly projectiles: Projectile[] = [];
    protected readonly colors = tankColors.orange;

    constructor(private boundary: Rect) {}

    update(dt: number): void {
        this.shootingDelay = Math.max(0, this.shootingDelay - dt);
        this.dy = 0;
        this.dx = 0;
        this.handleKeyboard();
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
        for (const projectile of this.projectiles) {
            projectile.update(dt);
        }
    }

    draw(ctx: Context): void {
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

    protected handleKeyboard(): void {
        if (Keyboard.pressed.KeyA) {
            this.dx = -this.v;
            this.direction = Direction.LEFT;
        }
        if (Keyboard.pressed.KeyD) {
            this.dx = this.v;
            this.direction = Direction.RIGHT;
        }
        if (Keyboard.pressed.KeyW) {
            this.dy = -this.v;
            this.direction = Direction.UP;
        }
        if (Keyboard.pressed.KeyS) {
            this.dy = this.v;
            this.direction = Direction.DOWN;
        }
        if (Keyboard.pressed.Space && !this.shootingDelay) {
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
    }

    getProjectilePos(): [number, number] {
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

export class EnemyTank extends Tank implements Entity {
    protected colors: TankColorSpecs = tankColors.green;
    protected handleKeyboard(): void {}
}

class Projectile implements Entity {
    public dead = false;
    private readonly box: Block;
    private readonly v = 7;
    static readonly SIZE = 8;

    constructor(
        x: number,
        y: number,
        private boundary: Rect,
        private direction: Direction,
    ) {
        this.box = new Block({
            x,
            y,
            width: Projectile.SIZE,
            height: Projectile.SIZE,
            color: Color.RED,
        });
    }

    get x(): number {
        return this.box.x;
    }

    get y(): number {
        return this.box.y;
    }

    update(dt: number): void {
        if (this.dead) {
            return;
        }
        if (isOutsideRect(this.box, this.boundary)) {
            this.dead = true;
        } else {
            moveEntity(this.box, this.v, this.direction);
            this.box.update(dt);
        }
    }

    draw(ctx: Context): void {
        if (!this.dead) {
            this.box.draw(ctx);
        }
    }
}

function isOutsideRect(entity: Rect, boundary: Rect): boolean {
    const { x, y, width, height } = boundary;
    return (
        entity.x < x ||
        entity.y < y ||
        entity.x + entity.width > x + width ||
        entity.y + entity.height > y + height
    );
}

function moveEntity(entity: Rect, value: number, direction: Direction): void {
    switch (direction) {
        case Direction.UP:
            entity.y -= value;
            break;
        case Direction.DOWN:
            entity.y += value;
            break;
        case Direction.RIGHT:
            entity.x += value;
            break;
        case Direction.LEFT:
            entity.x -= value;
            break;
    }
}
