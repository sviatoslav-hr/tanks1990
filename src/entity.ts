import { Color } from "./color";
import { Context } from "./context";
import { Keyboard } from "./keyboard";

export type Entity = {
    update(dt: number): void;
    draw(ctx: Context): void;
};

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
        ctx.setFillColor(this.bgColor);
        ctx.drawRect(this.x, this.y, this.width, this.height);
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
