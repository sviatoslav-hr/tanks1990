// TODO: maybe remove it to a class to have this state there.

import {Color} from '#/color';
import {BASE_FONT_SIZE, BASE_PADDING} from '#/const';
import {Context} from '#/context';
import {PlayerTank} from '#/entity';
import {getBestScore} from '#/storage';
import {Camera} from '#/camera';

export function drawScore(
    ctx: Context,
    player: PlayerTank,
    camera: Camera,
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
            x: camera.size.width - BASE_PADDING - maxWidth - innerPadding,
            y: BASE_PADDING - innerPadding,
            width: maxWidth + 2 * innerPadding,
            height: boundaryHeight + 2 * innerPadding,
        },
        2,
    );

    ctx.drawMultilineText(lines, {
        x: camera.size.width - BASE_PADDING,
        y: BASE_PADDING,
        shadowColor: Color.BLACK,
    });
}

export function drawGrid(ctx: Context, camera: Camera, cellSize: number): void {
    const x0 = cellSize - (camera.position.x % cellSize);
    const y0 = cellSize - (camera.position.y % cellSize);
    const {width, height} = camera.size;
    ctx.setStrokeColor(Color.BLACK_IERIE);
    const offset = 1;
    for (let colX = x0; colX < x0 + width + cellSize; colX += cellSize) {
        const x1 = colX + offset;
        const y1 = offset - cellSize;
        const x2 = x1;
        const y2 = height + offset + cellSize;
        ctx.drawLine(x1, y1, x2, y2);
    }
    for (let colY = y0; colY < y0 + height + cellSize; colY += cellSize) {
        const x1 = offset - cellSize;
        const x2 = width + offset + cellSize;
        const y1 = colY + offset;
        const y2 = y1;
        ctx.drawLine(x1, y1, x2, y2);
    }
}

function shortDate(date: Date): string {
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}
