import { Color } from "./color";
import { Context } from "./context";
import { EnemyTank, PlayerTank } from "./entity";
import { Keyboard } from "./keyboard";
import { STATE } from "./state";

export function createCanvas(width: number, height: number): HTMLCanvasElement {
    const element = document.createElement("canvas");
    element.width = width;
    element.height = height;
    return element;
}

export function startAnimation(canvas: HTMLCanvasElement): void {
    const ctx = new Context(canvas.getContext("2d")!);
    const screen = { x: 0, y: 0, width: canvas.width, height: canvas.height };
    STATE.tanks.push(new EnemyTank(screen));
    STATE.tanks.push(new PlayerTank(screen));
    STATE.tanks.forEach((t) => t.activateShield());

    let lastTimestamp = performance.now();
    let showFPS = false;
    let showBoundary = false;
    const animate = function (timestamp: number): void {
        const dt = timestamp - lastTimestamp;
        lastTimestamp = timestamp;
        ctx.clearScreen();
        STATE.tanks.forEach((t) => t.draw(ctx));
        if (showFPS) {
            drawFPS(ctx, dt);
        }
        for (const tank of STATE.tanks) {
            tank.showBoundary = showBoundary;
            tank.update(dt);
            if (tank.dead) {
                tank.respawn();
            }
        }
        window.requestAnimationFrame(animate);
    };
    window.requestAnimationFrame(animate);
    Keyboard.listen(document.body);
    Keyboard.onKeydown("KeyF", () => (showFPS = !showFPS));
    Keyboard.onKeydown("KeyB", () => (showBoundary = !showBoundary));
}

// TODO: maybe remove it to a class to have this state there.
// This way it's possible to have multiple independent FPS counters
let lastFPS: string = "0";
let fpsUpdateDelayMs = 0;
function drawFPS(ctx: Context, dt: number): void {
    let fps: string = "0";
    if (fpsUpdateDelayMs >= 0) {
        fps = lastFPS;
        fpsUpdateDelayMs -= dt;
    } else {
        fps = numround(1000 / dt).toString();
        lastFPS = fps;
        fpsUpdateDelayMs = 300;
    }

    ctx.setFillColor(Color.BLACK);
    ctx.setFont("600 36px Helvetica");
    ctx.drawText(fps, 8, 10);
    ctx.setFont("200 36px Helvetica");
    ctx.setFillColor(Color.WHITE);
    ctx.drawText(fps, 10, 10);
}

function numround(value: number, margin: number = 0): number {
    const n = 10 ** margin;
    return Math.round(value * n) / n;
}
