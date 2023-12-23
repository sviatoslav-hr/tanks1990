import { Color } from "./color";
import { Context } from "./context";
import { EnemyTank, PlayerTank } from "./entity";
import { Keyboard } from "./keyboard";
import { Rect } from "./math";
import { State } from "./state";

export function createCanvas(width: number, height: number): HTMLCanvasElement {
    const element = document.createElement("canvas");
    element.width = width;
    element.height = height;
    return element;
}

export function startAnimation(canvas: HTMLCanvasElement): void {
    const ctx = new Context(canvas.getContext("2d")!);
    const screen = { x: 0, y: 0, width: canvas.width, height: canvas.height };
    State.tanks.push(new EnemyTank(screen));
    State.tanks.push(new EnemyTank(screen));
    State.tanks.push(new EnemyTank(screen));
    State.tanks.push(new PlayerTank(screen));
    State.tanks.forEach((t) => (t.dead = true));

    let lastTimestamp = performance.now();
    let showFPS = false;
    let showBoundary = false;
    const animate = function (timestamp: number): void {
        const dt = timestamp - lastTimestamp;
        lastTimestamp = timestamp;
        ctx.clearScreen();
        drawGrid(ctx, screen, 100);
        State.tanks.forEach((t) => t.draw(ctx));
        if (showFPS) {
            drawFPS(ctx, dt);
        }
        for (const tank of State.tanks) {
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

function drawGrid(ctx: Context, boundary: Rect, cellSize: number): void {
    const { x, y, width, height } = boundary;
    for (let colX = cellSize; colX < x + width; colX += cellSize) {
        ctx.setStrokeColor(Color.BLACK_IERIE);
        ctx.drawLine(colX, y, colX, y + height);
    }
    for (let colY = cellSize; colY < y + height; colY += cellSize) {
        ctx.setStrokeColor(Color.BLACK_IERIE);
        ctx.drawLine(x, colY, x + width, colY);
    }
}

function numround(value: number, margin: number = 0): number {
    const n = 10 ** margin;
    return Math.round(value * n) / n;
}
