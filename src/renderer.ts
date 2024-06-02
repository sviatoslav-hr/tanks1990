import { Color } from './color';
import { BASE_HEIGHT, BASE_WIDTH, CELL_SIZE } from './const';
import { Context } from './context';
import { drawFPS, drawGrid, drawScore } from './draw';
import { Game, GameStatus } from './game';
import { keyboard } from './keyboard';
import { Menu } from './menu';
import {
    getStoredShowBoundaries,
    getStoredShowFps,
    saveBestScore,
    setStoredShowBoundaries,
    setStoredShowFps,
} from './storage';
import { assertError, panic } from './utils';

export class Renderer {
    readonly canvas: HTMLCanvasElement;
    readonly ctx: Context;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = BASE_WIDTH;
        this.canvas.height = BASE_HEIGHT;
        const ctx2d =
            this.canvas.getContext('2d', { willReadFrequently: true }) ??
            panic('Context should be available');
        this.ctx = new Context(ctx2d);
    }

    // TODO: renderer shouldn't be aware of these classes,
    // it should be more abstract
    startAnimation(game: Game, menu: Menu, storage: Storage): void {
        this.resizeCanvasByWindow();
        let lastTimestamp = performance.now();
        game.showFps = getStoredShowFps(storage);
        game.showBoundaries = getStoredShowBoundaries(storage);
        const animate = (timestamp: number): void => {
            const screen = game.screen;
            const dt = Math.min(timestamp - lastTimestamp, 1000 / 30);
            lastTimestamp = timestamp;
            this.ctx.clearScreen();
            this.ctx.setFillColor(Color.BLACK_RAISIN);
            this.ctx.drawRect(
                game.screen.x,
                game.screen.y,
                game.screen.width,
                game.screen.height,
            );
            drawGrid(this.ctx, game.screen, CELL_SIZE);
            game.drawTanks(this.ctx);
            if (game.showFps) drawFPS(this.ctx, dt);

            if (
                game.paused ||
                game.dead ||
                (game.playing && keyboard.isDown('KeyQ'))
            ) {
                drawScore(this.ctx, game.player, screen, storage);
            }
            if (game.player.dead && game.playing && !menu.dead) {
                saveBestScore(storage, game.player.score);
                menu.showDead();
            }
            game.updateTanks(dt, game.showBoundaries);
            keyboard.reset();
            window.requestAnimationFrame(animate);
        };
        window.requestAnimationFrame(animate);
        // TODO: animation function shouldn't be responsible for Keyboard handling
        this.handleKeyboard(game, menu, storage);
    }

    resizeCanvasByWindow(): void {
        this.resizeCanvas(window.innerWidth, window.innerHeight);
    }

    private handleKeyboard(game: Game, menu: Menu, storage: Storage): void {
        keyboard.listen(document.body);
        keyboard.onKeydown('Backquote', () => {
            game.showFps = !game.showFps;
            setStoredShowFps(storage, game.showFps);
        });
        keyboard.onKeydown('KeyB', () => {
            game.showBoundaries = !game.showBoundaries;
            setStoredShowBoundaries(storage, game.showBoundaries);
        });
        keyboard.onKeydown('Escape', () => {
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
    }

    private resizeCanvas(width: number, height: number): void {
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
        } else {
            this.canvas.style.width = '';
            this.canvas.style.height = '';
        }
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
            panic('ERROR: failed to exit Fullscreen\n' + err.message);
        });
    } else {
        await appElement.requestFullscreen().catch((err) => {
            assertError(err);
            panic('ERROR: failed to enter Fullscreen\n' + err.message);
        });
    }
}
