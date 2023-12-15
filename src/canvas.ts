import { Color } from "./color";
import { Context } from "./context";
import { Tank } from "./entity";

const WIDTH = 800;
const HEIGHT = 600;

export function createCanvas(): HTMLCanvasElement {
    const element = document.createElement("canvas");
    element.width = WIDTH;
    element.height = HEIGHT;
    return element;
}

export function startAnimation(canvas: HTMLCanvasElement): void {
    const ctx = new Context(canvas.getContext("2d")!);
    const tank = new Tank(canvas.width, canvas.height);

    let lastTimestamp = performance.now();
    const animate = function (timestamp: number): void {
        const dt = timestamp - lastTimestamp;
        lastTimestamp = timestamp;
        ctx.clearScreen();
        tank.draw(ctx);
        drawFPS(ctx, dt);
        tank.update(dt);
        window.requestAnimationFrame(animate);
    };
    window.requestAnimationFrame(animate);
}

function drawFPS(ctx: Context, dt: number): void {
    const fps = 1000 / dt;
    ctx.setFont("36px Helvetica");
    ctx.setFillColor(Color.WHITE);
    ctx.drawText(numround(fps).toString(), 10, 10);
}

function numround(value: number, margin: number = 0): number {
    const n = 10 ** margin;
    return Math.round(value * n) / n;
}
