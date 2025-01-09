import {Color} from '#/color';
import {BASE_FONT_SIZE, BASE_PADDING} from '#/const';
import {PlayerTank} from '#/entity';
import {GameStorage} from '#/storage';
import {Renderer} from '#/renderer';

const BEST_SCORE_KEY = 'best_score';
const BEST_SCORE_AT_KEY = 'best_score_at';

export type ScoreRecord = {
    score: number;
    createdAt: Date;
};

export function drawScore(
    renderer: Renderer,
    player: PlayerTank,
    cache: GameStorage,
): void {
    renderer.setFont('200 36px Helvetica', 'right', 'top');
    const innerPadding = BASE_PADDING / 2;

    const scoreText = `Score: ${player.score}`;
    const surviveText = `Survived: ${player.survivedFor.toHumanString()}`;
    const bestScore = getBestScore(cache);
    const bestScoreText =
        player.dead && bestScore?.score
            ? `Best Score: ${bestScore.score} - ${shortDate(bestScore.createdAt)}`
            : null;
    let text = `${scoreText}\n${surviveText}`;
    if (bestScoreText) {
        text += `\n${bestScoreText}`;
    }
    const lines = text.split('\n');
    const maxWidth = Math.max(
        ...lines.map((l) => renderer.measureText(l).width),
    );

    const camera = renderer.camera;
    const boundaryHeight = bestScoreText
        ? BASE_FONT_SIZE * 3
        : BASE_FONT_SIZE * 2;
    renderer.setStrokeColor(Color.WHITE);
    renderer.drawBoundary(
        {
            x: camera.size.width - BASE_PADDING - maxWidth - innerPadding,
            y: BASE_PADDING - innerPadding,
            width: maxWidth + 2 * innerPadding,
            height: boundaryHeight + 2 * innerPadding,
        },
        2,
    );

    renderer.drawMultilineText(lines, {
        x: camera.size.width - BASE_PADDING,
        y: BASE_PADDING,
        shadowColor: Color.BLACK,
    });
}

export function saveBestScore(cache: GameStorage, score: number): void {
    const storedScore = cache.getNumber(BEST_SCORE_KEY);
    if (storedScore == null || score > storedScore) {
        cache.set(BEST_SCORE_KEY, score.toString());
        cache.set(BEST_SCORE_AT_KEY, new Date().toISOString());
    }
}

export function getBestScore(cache: GameStorage): ScoreRecord | null {
    const score = cache.getNumber(BEST_SCORE_KEY);
    if (score == null || score === 0) {
        return null;
    }

    const createdAt = cache.getDate(BEST_SCORE_AT_KEY);
    if (createdAt == null) {
        console.warn('WARN: Found best score, but no creation date');
        return null;
    }

    return {score, createdAt};
}

function shortDate(date: Date): string {
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}
