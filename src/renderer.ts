import {Camera} from '#/camera';
import {Color} from '#/color';
import {BASE_HEIGHT, BASE_WIDTH, CELL_SIZE} from '#/const';
import {Context} from '#/context';
import {GameState} from '#/state';
import {GameInput} from '#/game-input';
import {drawScore} from '#/score';
import {GameStorage} from '#/storage';

export class Renderer {
    readonly canvas: HTMLCanvasElement;
    readonly ctx: Context;
    readonly camera: Camera;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = BASE_WIDTH;
        this.canvas.height = BASE_HEIGHT;
        this.camera = new Camera(this.canvas.width, this.canvas.height);

        const ctx2d = this.canvas.getContext('2d', {
            willReadFrequently: true,
        });
        if (!ctx2d) {
            throw new Error('Context should be available');
        }
        this.ctx = new Context(ctx2d);
    }

    render(game: GameState, input: GameInput, storage: GameStorage): void {
        const world = game.world;
        this.ctx.setFillColor(Color.BLACK_RAISIN);
        this.ctx.fillScreen();
        drawGrid(this.ctx, this.camera, CELL_SIZE);
        world.draw(this.ctx, this.camera);

        if (
            game.paused ||
            game.dead ||
            (game.playing && input.isDown('KeyQ'))
        ) {
            drawScore(this.ctx, world.player, this.camera, storage);
        }
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
}

export async function toggleFullscreen(appElement: HTMLElement): Promise<void> {
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
