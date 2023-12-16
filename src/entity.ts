import { Color } from "./color";
import { Context } from "./context";
import { Keyboard } from "./keyboard";

export type Entity = {
    update(dt: number): void;
    draw(ctx: Context): void;
};

type BlockOpts = {
    x: number;
    y: number;
    width: number;
    height: number;
    color: Color;
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

    update(dt: number): void {
        throw new Error("Method not implemented.");
    }

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
    private dx = 0;
    private dy = 0;
    private readonly bgColor = Color.ORANGE_SAFFRON;
    private readonly v = 5;

    constructor(
        private screenWidth: number,
        private screenHeight: number,
    ) {}

    update(_: number): void {
        this.handleKeyboard();
        this.x += this.dx;
        this.y += this.dy;
        this.x = clamp(this.x, 0, this.screenWidth - this.width);
        this.y = clamp(this.y, 0, this.screenHeight - this.height);
    }

    draw(ctx: Context): void {
        ctx.setFillColor(Color.ORANGE_GAMBOGE);
        const wheelWidth = this.width * 0.25;
        const wheelHeight = this.height * 0.75;
        const bodyHeight = wheelHeight * 0.8;
        const headSize = bodyHeight * 0.7;
        const wheelYOffset = this.height - wheelHeight;
        ctx.drawRect(this.x, this.y + wheelYOffset, wheelWidth, wheelHeight);
        ctx.drawRect(
            this.x + 3 * wheelWidth,
            this.y + wheelYOffset,
            wheelWidth,
            wheelHeight,
        );
        const bodyYOffset = wheelYOffset + (wheelHeight - bodyHeight) / 2;
        ctx.drawRect(this.x, this.y + bodyYOffset, this.width, bodyHeight);
        ctx.setFillColor(Color.ORANGE_SAFFRON);
        const headYOffset = bodyYOffset + (bodyHeight - headSize) / 2;
        ctx.drawRect(
            this.x + wheelWidth,
            this.y + headYOffset,
            this.width - 2 * wheelWidth,
            headSize,
        );
        ctx.setFillColor(Color.WHITE_NAVAJO);
        const gunWidth = this.width / 15;
        ctx.drawRect(
            this.x + (this.width - gunWidth) / 2,
            this.y,
            gunWidth,
            headYOffset,
        );
    }

    private handleKeyboard(): void {
        this.dy = 0;
        this.dx = 0;
        if (Keyboard.pressed.KeyA) {
            this.dx = -this.v;
        }
        if (Keyboard.pressed.KeyD) {
            this.dx = this.v;
        }
        if (Keyboard.pressed.KeyW) {
            this.dy = -this.v;
        }
        if (Keyboard.pressed.KeyS) {
            this.dy = this.v;
        }
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}
