import {Color} from '#/color';
import {BASE_HEIGHT, BASE_WIDTH, CELL_SIZE} from '#/const';
import {Context} from '#/context';
import {DevUI} from '#/dev-ui';
import {Game} from '#/game';
import {Duration} from '#/math/duration';
import {Menu} from '#/menu';
import {drawScore, saveBestScore} from '#/score';
import {GameStorage} from '#/storage';
import {Camera} from './camera';
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
        camera: Camera,
        input: GameInput,
        menu: Menu,
        cache: GameStorage,
        devUI: DevUI,
    ): void {
        this.resizeCanvas(window.innerWidth, window.innerHeight);
        this.lastTimestamp = performance.now();

        const animationCallback = this.createAnimationCallback(
            game,
            camera,
            input,
            menu,
            devUI,
            cache,
        );
        window.requestAnimationFrame(animationCallback);
        // TODO: animation function shouldn't be responsible for Keyboard handling
        this.handleKeyboard(input, game, menu);
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

    private handleKeyboard(input: GameInput, game: Game, menu: Menu): void {
        input.listen(document.body);
        input.onKeydown('KeyB', () => {
            game.world.showBoundary = !game.world.showBoundary;
        });
        input.onKeydown('BracketRight', () => {
            if (!game.paused) {
                return;
            }
            menu.hide();
            game.debugUpdateTriggered = true;
        });
        input.onKeydown('KeyP', () => {
            if (game.dead) {
                menu.showMain();
            } else if (game.playing) {
                menu.showPause();
            } else {
                menu.hide();
            }
            game.togglePauseResume();
        });
        input.onKeydown('KeyO', () => game.togglePauseResume());
    }

    private createAnimationCallback(
        game: Game,
        camera: Camera,
        input: GameInput,
        menu: Menu,
        devUI: DevUI,
        cache: GameStorage,
    ): AnimationCallback {
        const animationCallback = (timestamp: number): void => {
            const world = game.world;
            const dt = Duration.since(this.lastTimestamp).min(1000 / 30);
            this.lastTimestamp = timestamp;
            this.ctx.setFillColor(Color.BLACK_RAISIN);
            this.ctx.fillScreen();

            drawGrid(this.ctx, camera, CELL_SIZE);
            world.draw(this.ctx, camera);
            if (
                game.paused ||
                game.dead ||
                (game.playing && input.isDown('KeyQ'))
            ) {
                drawScore(this.ctx, world.player, camera, cache);
            }

            if (world.player.dead && game.playing && !menu.dead) {
                saveBestScore(cache, world.player.score);
                menu.showDead();
            }

            if (game.playing || game.debugUpdateTriggered) {
                world.update(dt, camera);
                if (world.isInfinite) {
                    camera.centerOn(world.player);
                }
            }
            game.tick();
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

function drawGrid(ctx: Context, camera: Camera, cellSize: number): void {
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
