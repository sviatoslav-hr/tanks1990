import {BASE_PADDING} from '#/const';
import {PlayerTank} from '#/entity';
import {GameStorage} from '#/storage';
import {Renderer} from '#/renderer';
import {EntityManager} from './entity/manager';
import {css, CustomElement, div, ReactiveElement} from './html';
import {Duration} from './math/duration';
import {Menu} from './menu';

const BEST_SCORE_KEY = 'best_score';
const BEST_SCORE_AT_KEY = 'best_score_at';

export type ScoreRecord = {
    score: number;
    createdAt: Date;
};

export function drawScoreMini(
    renderer: Renderer,
    manager: EntityManager,
    cache: GameStorage,
): void {
    renderer.useCameraCoords(true);
    const player = manager.player;
    const world = manager.world;
    const camera = renderer.camera;
    const padding = BASE_PADDING / 2;

    {
        const bestScore = getBestScore(cache);
        const bestScoreText =
            'Best Score: ' +
            (bestScore ? `${bestScore.score} (${shortDate(bestScore.createdAt)})` : '-');
        const x = camera.screenSize.width / 2 - (world.boundary.width * camera.scale) / 2;
        const y = padding;
        renderer.setFont('200 20px Helvetica', 'start', 'top');
        renderer.fillText(bestScoreText, {x, y});
    }

    {
        const scoreText = `Score: ${player.score}`;
        const m = renderer.measureText(scoreText);
        const x = camera.screenSize.width / 2 - m.width / 2;
        const y = padding;
        renderer.setFont('200 20px Helvetica', 'start', 'top');
        renderer.fillText(scoreText, {x, y});
    }

    {
        const surviveText = `Survived for ${player.survivedFor.toHumanString()}`;
        const x = camera.screenSize.width / 2 + (world.boundary.width * camera.scale) / 2;
        const y = padding;
        renderer.setFont('200 20px Helvetica', 'right', 'top');
        renderer.fillText(surviveText, {x, y});
    }
    renderer.useCameraCoords(false);
}

interface ScoreState {
    bestScoreOnly: boolean;
    currentScore: number;
    bestScore: ScoreRecord | null;
    survivedFor: Duration;
}

function bestScoreEquals(a: ScoreRecord | null, b: ScoreRecord | null): boolean {
    if (a === b) {
        return true;
    }
    if (a == null || b == null) {
        return false;
    }
    return a.score === b.score && a.createdAt.getTime() === b.createdAt.getTime();
}

@CustomElement('g-score-overlay')
export class ScoreOverlay extends ReactiveElement {
    bestScoreOnly = true;
    currentScore = 0;
    bestScore: ScoreRecord | null = null;
    survivedFor = Duration.zero();

    updateState(state: ScoreState): void {
        let stateChanged = false;
        if (this.bestScoreOnly !== state.bestScoreOnly) {
            this.bestScoreOnly = state.bestScoreOnly;
            stateChanged = true;
        }
        if (this.currentScore !== state.currentScore) {
            this.currentScore = state.currentScore;
            stateChanged = true;
        }
        if (!bestScoreEquals(this.bestScore, state.bestScore)) {
            this.bestScore = state.bestScore;
            stateChanged = true;
        }
        if (!this.survivedFor.equals(state.survivedFor)) {
            this.survivedFor.setFrom(state.survivedFor);
            stateChanged = true;
        }
        if (stateChanged) {
            console.log('updateState > rerender');
            this.rerender();
        }
    }

    protected override render(): HTMLElement {
        const bestScoreText = this.bestScore
            ? `Best Score: ${this.bestScore.score} (${shortDate(this.bestScore.createdAt)})`
            : null;
        return div({
            className: ['score-overlay', this.bestScoreOnly ? 'score-overlay--best' : ''],
            children: [
                !this.bestScoreOnly && div({textContent: `Score: ${this.currentScore}`}),
                !this.bestScoreOnly &&
                    div({textContent: `Survived for ${this.survivedFor.toHumanString()}`}),
                bestScoreText && div({textContent: bestScoreText}),
            ],
        });
    }

    protected override styles(): HTMLStyleElement | null {
        return css`
            .score-overlay {
                position: relative;
                padding: 0.5rem;
                color: white;
                font: 500 1.5rem Helvetica;
                width: 100%;
                margin: 0 auto;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                gap: 2rem;
            }
            .score-overlay--best {
                font-size: 2rem;
            }
            .score-overlay div {
                white-space: nowrap;
                text-shadow: #fc0 1px 0 5px;
            }
        `;
    }
}

export function updateScoreInMenu(menu: Menu, player: PlayerTank, cache: GameStorage): void {
    menu.score.updateState({
        currentScore: player.score,
        // PERF: Cache best score instead of reading from storage constantly
        bestScore: getBestScore(cache),
        survivedFor: player.survivedFor,
        bestScoreOnly: menu.isMain,
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
        console.error('WARN: Found best score, but no creation date');
        return null;
    }

    return {score, createdAt};
}

function shortDate(date: Date): string {
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}
