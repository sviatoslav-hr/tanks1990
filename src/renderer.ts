import {Color} from '#/color';
import {BASE_HEIGHT, BASE_WIDTH, CELL_SIZE} from '#/const';
import {Context} from '#/context';
import {drawGrid, drawScore} from '#/draw';
import {Game, GameStatus} from '#/game';
import {Menu} from '#/menu';
import {
    getStoredShowBoundaries,
    saveBestScore,
    setStoredShowBoundaries,
} from '#/storage';
import {Duration} from '#/math/duration';
import {DevUI, setupDevUI} from '#/dev-ui';
import {GameInput} from './game-input';

type AnimationCallback = (timestamp: number) => void;

export class Renderer {
    readonly canvas: HTMLCanvasElement;
    readonly ctx: Context;
    private lastTimestamp = 0;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = BASE_WIDTH;
        this.canvas.height = BASE_HEIGHT;
        const ctx2d = this.canvas.getContext('2d', {
            willReadFrequently: true,
        });
        if (!ctx2d) {
            throw new Error('Context should be available');
        }
        this.ctx = new Context(ctx2d);
    }

    // TODO: renderer shouldn't be aware of these classes,
    // it should be more abstract
    startAnimation(
        game: Game,
        input: GameInput,
        menu: Menu,
        storage: Storage,
    ): void {
        this.resizeCanvas(window.innerWidth, window.innerHeight);
        this.lastTimestamp = performance.now();
        const devUI = setupDevUI(game.world, storage);
        game.world.showBoundary = getStoredShowBoundaries(storage);

        const animationCallback = this.createAnimationCallback(
            game,
            input,
            menu,
            devUI,
            storage,
        );
        window.requestAnimationFrame(animationCallback);
        // TODO: animation function shouldn't be responsible for Keyboard handling
        this.handleKeyboard(input, game, menu, devUI, storage);
    }

    resizeCanvas(width: number, height: number): [number, number] {
        const shouldScale = width < BASE_WIDTH || height < BASE_HEIGHT;
        if (document.fullscreenElement || shouldScale) {
            const padding = 20;
            const sx = (width - padding) / BASE_WIDTH;
            const sy = (height - padding) / BASE_HEIGHT;
            const sMin = Math.min(sx, sy);
            const resWidth = BASE_WIDTH * sMin;
            const resHeight = BASE_HEIGHT * sMin;
            this.canvas.style.width = resWidth + 'px';
            this.canvas.style.height = resHeight + 'px';
            return [resWidth, resHeight];
        } else {
            this.canvas.style.width = '';
            this.canvas.style.height = '';
            return [BASE_WIDTH, BASE_HEIGHT];
        }
    }

    private handleKeyboard(
        input: GameInput,
        game: Game,
        menu: Menu,
        devUI: DevUI,
        storage: Storage,
    ): void {
        input.listen(document.body);
        input.onKeydown('Backquote', () => {
            devUI.fpsMonitor.toggleVisibility(storage);
        });
        input.onKeydown('Backslash', () => {
            devUI.devPanel.toggleVisibility(storage);
        });
        input.onKeydown('KeyB', () => {
            game.world.showBoundary = !game.world.showBoundary;
            setStoredShowBoundaries(storage, game.world.showBoundary);
        });
        input.onKeydown('KeyP', () => {
            switch (game.status) {
                case GameStatus.PLAYING: {
                    if (game.dead) {
                        menu.showMain();
                        game.init();
                    } else {
                        menu.showPause();
                        game.pause();
                    }
                    break;
                }
                case GameStatus.PAUSED: {
                    menu.hide();
                    game.resume();
                    break;
                }
                case GameStatus.INITIAL:
                    break;
                default:
                    console.warn('Unhandled value ', game.status);
            }
        });
        input.onKeydown('KeyO', () => {
            switch (game.status) {
                case GameStatus.PLAYING: {
                    if (game.dead) {
                        game.init();
                    } else {
                        game.pause();
                    }
                    break;
                }
                case GameStatus.PAUSED: {
                    game.resume();
                    break;
                }
                case GameStatus.INITIAL:
                    break;
                default:
                    console.warn('Unhandled value ', game.status);
            }
        });
    }

    private createAnimationCallback(
        game: Game,
        input: GameInput,
        menu: Menu,
        devUI: DevUI,
        storage: Storage,
    ): AnimationCallback {
        const animationCallback = (timestamp: number): void => {
            const screen = game.screen;
            const world = game.world;
            const dt = Duration.since(this.lastTimestamp).min(1000 / 30);
            this.lastTimestamp = timestamp;
            this.ctx.clearScreen();
            this.ctx.setFillColor(Color.BLACK_RAISIN);
            this.ctx.drawRect(
                game.screen.x,
                game.screen.y,
                game.screen.width,
                game.screen.height,
            );
            drawGrid(this.ctx, game, CELL_SIZE);
            world.draw(this.ctx);
            if (
                game.paused ||
                game.dead ||
                (game.playing && input.isDown('KeyQ'))
            ) {
                drawScore(this.ctx, world.player, screen, storage);
            }
            if (world.player.dead && game.playing && !menu.dead) {
                saveBestScore(storage, world.player.score);
                menu.showDead();
            }
            if (game.playing) {
                world.update(dt);
            }
            input.tick();
            devUI.update(dt);
            window.requestAnimationFrame(animationCallback);
        };
        return animationCallback;
    }
}

export async function toggleFullscreen(
    appElement: HTMLDivElement,
): Promise<void> {
    if (!document.fullscreenEnabled) {
        console.warn('Fullscreen is either not supported or disabled');
        return;
    }
    if (document.fullscreenElement) {
        await document.exitFullscreen().catch((err) => {
            assertError(err);
            throw new Error('ERROR: failed to exit Fullscreen\n' + err.message);
        });
    } else {
        await appElement.requestFullscreen().catch((err) => {
            assertError(err);
            throw new Error(
                'ERROR: failed to enter Fullscreen\n' + err.message,
            );
        });
    }
}
