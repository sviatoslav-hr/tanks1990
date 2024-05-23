// TODO: maybe remove it to a class to have this state there.

import { Color } from './color';
import { BASE_FONT_SIZE, BASE_PADDING } from './const';
import { Context } from './context';
import { PlayerTank } from './entity';
import { Rect, numround, xn } from './math';
import { getBestScore } from './storage';

// This way it's possible to have multiple independent FPS counters
let lastFPS: string = '0';
let fpsUpdateDelayMs = 0;
export function drawFPS(ctx: Context, dt: number): void {
    let fps: string = '0';
    if (fpsUpdateDelayMs >= 0) {
        fps = lastFPS;
        fpsUpdateDelayMs -= dt;
    } else {
        fps = numround(1000 / dt).toString();
        lastFPS = fps;
        fpsUpdateDelayMs = 300;
    }

    ctx.setFont('200 36px Helvetica');
    ctx.drawText(fps, { x: 10, y: 10 });
}

export function drawScore(
    ctx: Context,
    player: PlayerTank,
    boundary: Rect,
    storage: Storage,
): void {
    ctx.setFont('200 36px Helvetica', 'right', 'top');
    const innerPadding = BASE_PADDING / 2;

    const scoreText = `Score: ${player.score}`;
    const surviveText = `Survived: ${humanDuration(player.survivedMs)}`;
    const bestScore = getBestScore(storage);
    const bestScoreText =
        player.dead && bestScore?.score
            ? `Best Score: ${bestScore.score} - ${shortDate(bestScore.createdAt)}`
            : null;
    let text = `${scoreText}\n${surviveText}`;
    if (bestScoreText) {
        text += `\n${bestScoreText}`;
    }
    const lines = text.split('\n');
    const maxWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));

    const boundaryHeight = bestScoreText
        ? BASE_FONT_SIZE * 3
        : BASE_FONT_SIZE * 2;
    ctx.setStrokeColor(Color.WHITE);
    ctx.drawBoundary(
        {
            x: xn(boundary) - BASE_PADDING - maxWidth - innerPadding,
            y: BASE_PADDING - innerPadding,
            width: maxWidth + 2 * innerPadding,
            height: boundaryHeight + 2 * innerPadding,
        },
        2,
    );

    ctx.drawMultilineText(lines, {
        x: xn(boundary) - BASE_PADDING,
        y: BASE_PADDING,
        shadowColor: Color.BLACK,
    });
}

export function drawGrid(ctx: Context, boundary: Rect, cellSize: number): void {
    const { x, y, width, height } = boundary;
    for (let colX = cellSize; colX < x + width; colX += cellSize) {
        ctx.setStrokeColor(Color.BLACK_IERIE);
        ctx.drawLine(colX + 1, y + 1, colX + 1, y + height + 1);
    }
    for (let colY = cellSize; colY < y + height; colY += cellSize) {
        ctx.setStrokeColor(Color.BLACK_IERIE);
        ctx.drawLine(x + 1, colY + 1, x + width + 1, colY + 1);
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
    return `${Math.floor(ms)}ms`;
}

function shortDate(date: Date): string {
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}
