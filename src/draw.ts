// TODO: maybe remove it to a class to have this state there.

import { Color } from './color';
import { BASE_FONT_SIZE, BASE_PADDING } from './const';
import { Context } from './context';
import { PlayerTank } from './entity';
import { Game } from './game';
import { Rect, xn } from './math';
import { getBestScore } from './storage';

export function drawScore(
    ctx: Context,
    player: PlayerTank,
    boundary: Rect,
    storage: Storage,
): void {
    ctx.setFont('200 36px Helvetica', 'right', 'top');
    const innerPadding = BASE_PADDING / 2;

    const scoreText = `Score: ${player.score}`;
    const surviveText = `Survived: ${player.survivedFor.toHumanString()}`;
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

export function drawGrid(ctx: Context, game: Game, cellSize: number): void {
    let { x, y, width, height } = game.screen;
    x += game.world.offset.x % cellSize;
    y += game.world.offset.y % cellSize;
    ctx.setStrokeColor(Color.BLACK_IERIE);
    for (let colX = x; colX < x + width + cellSize; colX += cellSize) {
        ctx.drawLine(
            colX + 1,
            y + 1 - cellSize,
            colX + 1,
            y + height + 1 + cellSize,
        );
    }
    for (let colY = y; colY < y + height + cellSize; colY += cellSize) {
        ctx.drawLine(
            x + 1 - cellSize,
            colY + 1,
            x + width + 1 + cellSize,
            colY + 1,
        );
    }
}

function shortDate(date: Date): string {
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}
