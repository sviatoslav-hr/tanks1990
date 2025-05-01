import {Color} from '#/color';
import {BASE_PADDING, CELL_SIZE} from '#/const';
import {EntityManager} from '#/entity/manager';
import {css, CustomElement, div, ReactiveElement} from '#/html';
import {Duration} from '#/math/duration';
import {Menu} from '#/menu';
import {Renderer} from '#/renderer';
import {GameStorage} from '#/storage';

const BEST_SCORE_KEY = 'best_score';

export interface ScoreRecord {
    score: number;
    roomIndex: number;
    createdAt: Date;
}

export function drawScoreMini(renderer: Renderer, manager: EntityManager): void {
    const player = manager.player;
    const world = manager.world;
    const padding = BASE_PADDING / 2;
    const roomBounds = world.activeRoom.boundary;
    const fontSize = 20;
    const y = roomBounds.y + roomBounds.height + padding / 2 + fontSize / 8;
    const font = `500 ${fontSize}px Helvetica`;

    const bestScore = manager.bestScore;
    if (bestScore) {
        const text =
            'Best Score: ' +
            (bestScore ? `${bestScore.score} (${shortDate(bestScore.createdAt)})` : '-');
        const x = roomBounds.x - CELL_SIZE + padding;
        renderer.setFont(font, 'start', 'top');
        renderer.fillText(text, {x, y, shadowColor: Color.BLACK_RAISIN});
    }

    {
        const text = `Score: ${player.score}`;
        const x = roomBounds.x + roomBounds.width / 2;
        renderer.setFont(font, 'center', 'top');
        renderer.fillText(text, {x, y, shadowColor: Color.BLACK_RAISIN});
    }

    {
        const text = `Survived for ${player.survivedFor.toHumanString()}`;
        const x = roomBounds.x + roomBounds.width + CELL_SIZE - padding;
        renderer.setFont(font, 'right', 'top');
        renderer.fillText(text, {x, y, shadowColor: Color.BLACK_RAISIN});
    }
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
    roomIndex = 0;

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
            this.rerender();
        }
    }

    protected override render(): HTMLElement {
        const best = this.bestScore;
        const bestScoreText = best
            ? `Best Record (${shortDate(best.createdAt)})\nRoom: ${best.roomIndex + 1}, Score: ${best.score} `
            : null;
        return div({
            className: ['score-overlay', this.bestScoreOnly ? 'score-overlay--best' : ''],
            children: [
                !this.bestScoreOnly &&
                    div({textContent: `Survived for ${this.survivedFor.toHumanString()}`}),
                !this.bestScoreOnly &&
                    div({
                        textContent: `Current Record\nRoom: ${this.roomIndex + 1}, Score: ${this.currentScore}`,
                    }),
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
                font-size: 2rem;
            }
            .score-overlay--best {
                font-size: 3rem;
            }
            .score-overlay div {
                white-space: pre-line;
                text-shadow: #fc0 1px 0 5px;
            }
        `;
    }
}

export function updateScoreInMenu(menu: Menu, manager: EntityManager): void {
    menu.score.updateState({
        currentScore: manager.player.score,
        bestScore: manager.bestScore,
        survivedFor: manager.player.survivedFor,
        bestScoreOnly: menu.isMain,
    });
}

export function saveBestScore(cache: GameStorage, manager: EntityManager): void {
    const best = manager.bestScore;
    const score = manager.player.score;
    if (best == null || score > best.score) {
        const roomIndex = manager.world.activeRoom.roomIndex;
        cache.set(BEST_SCORE_KEY, JSON.stringify({s: score, r: roomIndex, d: Date.now()}));
    }
}

export function getBestScore(cache: GameStorage): ScoreRecord | null {
    const parser = cache.getObjectParser(BEST_SCORE_KEY);
    if (parser == null) {
        return null;
    }
    const score = parser.getNumber('s');
    const roomIndex = parser.getNumber('r');
    const dateNum = parser.getNumber('d');
    if (score == null || roomIndex == null || dateNum == null) {
        return null;
    }
    const createdAt = new Date();
    return {score, roomIndex, createdAt};
}

function shortDate(date: Date): string {
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}
