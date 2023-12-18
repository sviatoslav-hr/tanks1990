import { Color } from "./color";
import { Context } from "./context";
import { EnemyTank, Tank } from "./entity";
import { Keyboard } from "./keyboard";

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
    const screen = { x: 0, y: 0, width: canvas.width, height: canvas.height };
    const tank = new Tank(screen);
    const enemy = new EnemyTank(screen);

    let lastTimestamp = performance.now();
    let showFPS = false;
    const animate = function (timestamp: number): void {
        const dt = timestamp - lastTimestamp;
        lastTimestamp = timestamp;
        ctx.clearScreen();
        tank.draw(ctx);
        enemy.draw(ctx);
        if (showFPS) {
            drawFPS(ctx, dt);
        }
        tank.update(dt);
        enemy.update(dt);
        window.requestAnimationFrame(animate);
    };
    window.requestAnimationFrame(animate);
    Keyboard.listen(document.body);
    Keyboard.onKeydown("KeyF", (code) => (showFPS = !showFPS));
    Keyboard.onKeydown("KeyB", () => (tank.showBoundary = !tank.showBoundary));
}

function drawFPS(ctx: Context, dt: number): void {
    const fps = numround(1000 / dt).toString();
    ctx.setFillColor(Color.BLACK);
    ctx.setFont("200 40px Helvetica");
    ctx.drawText(fps, 8, 8);
    ctx.setFont("200 36px Helvetica");
    ctx.setFillColor(Color.WHITE);
    ctx.drawText(fps, 10, 10);
}

function numround(value: number, margin: number = 0): number {
    const n = 10 ** margin;
    return Math.round(value * n) / n;
}
