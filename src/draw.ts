// TODO: maybe remove it to a class to have this state there.

import { Color } from "./color";
import { Context } from "./context";
import { PlayerTank } from "./entity";
import { Rect, numround, xn } from "./math";

// This way it's possible to have multiple independent FPS counters
let lastFPS: string = "0";
let fpsUpdateDelayMs = 0;
export function drawFPS(ctx: Context, dt: number): void {
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
    ctx.setFont("200 36px Helvetica");
    ctx.drawText(fps, 7, 10);
    ctx.setFont("200 36px Helvetica");
    ctx.setFillColor(Color.WHITE);
    ctx.drawText(fps, 10, 10);
}

export function drawScore(
    ctx: Context,
    player: PlayerTank,
    boundary: Rect,
): void {
    const scoreText = `Score: ${player.score}\n`;
    drawText(ctx, scoreText, xn(boundary) - scoreText.length * 10, 10);
    if (player.dead || true) {
        const surviveText = `Survived: ${humanDuration(player.survivedMs)}`;
        drawText(ctx, surviveText, xn(boundary) - surviveText.length * 10, 44);
    }
}

function drawText(ctx: Context, text: string, x: number, y: number): void {
    ctx.setFillColor(Color.BLACK);
    ctx.setFont("200 36px Helvetica", "center", "top");
    ctx.drawText(text, x - 3, y);
    ctx.setFillColor(Color.WHITE);
    ctx.drawText(text, x, y);
}

export function drawGrid(ctx: Context, boundary: Rect, cellSize: number): void {
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

function humanDuration(ms: number): string {
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    if (mins) {
        const secsRest = Math.floor(secs - mins * 60);
        return `${mins}m ${secsRest}s`;
    }
    if (secs) {
        return `${secs}s`;
    }
    return `${ms}ms`;
}
