import {Camera} from '#/camera';
import {Color} from '#/color';
import {BASE_FONT_SIZE, BASE_HEIGHT, BASE_WIDTH} from '#/const';
import {Rect} from '#/math';
import {Transform} from '#/math/transform';

type ShadowTextOpts = {
    x: number;
    y: number;
    color?: Color;
    shadowColor?: Color;
};

export class Renderer {
    readonly canvas: HTMLCanvasElement;
    readonly ctx: CanvasRenderingContext2D;
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
        this.ctx = ctx2d;
    }

    drawBoundary(
        {x, y, width, height}: Rect,
        lineWidth = 1,
        camera?: Camera,
    ): void {
        if (camera) {
            x -= camera.position.x;
            y -= camera.position.y;
        }
        this.drawLine(x, y, x + width, y, lineWidth);
        this.drawLine(x + width, y, x + width, y + height, lineWidth);
        this.drawLine(x + width, y + height, x, y + height, lineWidth);
        this.drawLine(x, y + height, x, y, lineWidth);
    }

    drawRect(x: number, y: number, width: number, height: number): void {
        this.ctx.fillRect(x, y, width, height);
    }

    drawRect2({x, y, width, height}: Rect): void {
        this.ctx.fillRect(x, y, width, height);
    }

    fillCircle(cx: number, cy: number, radius: number): void {
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawLine(x0: number, y0: number, x1: number, y1: number, width = 1): void {
        this.ctx.lineWidth = width;
        this.ctx.beginPath();
        this.ctx.moveTo(x0, y0);
        this.ctx.lineTo(x1, y1);
        this.ctx.stroke();
    }

    drawText(
        text: string,
        {x, y, color = Color.WHITE, shadowColor}: ShadowTextOpts,
    ): void {
        if (shadowColor) {
            this.setFillColor(shadowColor);
            const offsetX = BASE_FONT_SIZE / 10;
            this.ctx.fillText(text, x - offsetX, y);
        }
        this.setFillColor(color);
        this.ctx.fillText(text, x, y);
    }

    drawMultilineText(textRows: string[], opts: ShadowTextOpts): void {
        for (const [index, text] of textRows.entries()) {
            const lineY = opts.y + BASE_FONT_SIZE * index;
            this.drawText(text, {...opts, y: lineY});
        }
    }

    drawImage(
        src: CanvasImageSource,
        sx: number,
        sy: number,
        sw: number,
        sh: number,
        dx: number,
        dy: number,
        dw: number,
        dh: number,
    ): void {
        // drawImage(image: CanvasImageSource, dx: number, dy: number): void;
        // drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void;
        // drawImage(image: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
        this.ctx.drawImage(src, sx, sy, sw, sh, dx, dy, dw, dh);
    }

    getImageData(
        x: number,
        y: number,
        width: number,
        height: number,
    ): ImageData {
        return this.ctx.getImageData(x, y, width, height);
    }

    setTransform(transform: Transform): void {
        const {a, b, c, d, e, f} = transform;
        this.ctx.setTransform(a, b, c, d, e, f);
    }

    resetTransform(): void {
        this.setTransform(Transform.makeCrear());
    }

    setFont(
        font: string,
        align: CanvasTextAlign = 'start',
        baseline: CanvasTextBaseline = 'top',
    ): void {
        this.ctx.font = font;
        this.ctx.textBaseline = baseline;
        this.ctx.textAlign = align;
    }

    setStrokeColor(color: Color | string) {
        if (this.ctx.strokeStyle !== color) {
            this.ctx.strokeStyle = color;
        }
    }

    setFillColor(color: Color | string) {
        if (this.ctx.fillStyle !== color) {
            this.ctx.fillStyle = color;
        }
    }

    rotate(deg: number): void {
        this.ctx.rotate((deg * Math.PI) / 180);
    }

    scale(scaling: number): void {
        this.ctx.scale(scaling, scaling);
    }

    measureText(text: string): TextMetrics {
        return this.ctx.measureText(text);
    }

    setGlobalAlpha(alpha: number) {
        assert(
            alpha >= 0 && alpha <= 1,
            `Alpha should be in range [0, 1]. Got: ${alpha}`,
        );
        this.ctx.globalAlpha = alpha;
    }

    fillScreen(): void {
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
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
