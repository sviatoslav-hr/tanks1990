import {Camera} from '#/camera';
import {Color} from '#/color';
import {APP_ELEMENT_ID, BASE_FONT_SIZE} from '#/const';
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
    private usingCameraCoords = false;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.camera = new Camera(this.canvas.width, this.canvas.height);

        const ctx2d = this.canvas.getContext('2d', {
            willReadFrequently: true,
        });
        if (!ctx2d) {
            throw new Error('Context should be available');
        }
        this.ctx = ctx2d;
    }

    // NOTE: Most stuff is drawn in world coordinates, but some stuff (like UI) should be drawn in screen(camera) coordinates
    useCameraCoords(value: boolean): void {
        this.usingCameraCoords = value;
    }

    strokeBoundary({x, y, width, height}: Rect, lineWidth = 1): void {
        if (
            !this.usingCameraCoords &&
            !this.camera.isRectVisible(x, y, width, height)
        ) {
            return;
        }
        x = this.offsetXByCamera(x);
        y = this.offsetYByCamera(y);
        width = this.offsetSizeByCamera(width);
        height = this.offsetSizeByCamera(height);
        lineWidth = this.offsetSizeByCamera(lineWidth);
        const usingCameraCoords = this.usingCameraCoords;
        if (!usingCameraCoords) {
            this.useCameraCoords(true);
        }
        this.strokeLine(x, y, x + width, y, lineWidth);
        this.strokeLine(x + width, y, x + width, y + height, lineWidth);
        this.strokeLine(x + width, y + height, x, y + height, lineWidth);
        this.strokeLine(x, y + height, x, y, lineWidth);
        if (!usingCameraCoords) {
            this.useCameraCoords(false);
        }
    }

    fillRect(x: number, y: number, width: number, height: number): void {
        if (
            !this.usingCameraCoords &&
            !this.camera.isRectVisible(x, y, width, height)
        ) {
            return;
        }
        x = this.offsetXByCamera(x);
        y = this.offsetYByCamera(y);
        width = this.offsetSizeByCamera(width);
        height = this.offsetSizeByCamera(height);
        this.ctx.fillRect(x, y, width, height);
    }

    fillRect2({x, y, width, height}: Rect): void {
        if (
            !this.usingCameraCoords &&
            !this.camera.isRectVisible(x, y, width, height)
        ) {
            return;
        }
        x = this.offsetXByCamera(x);
        y = this.offsetYByCamera(y);
        width = this.offsetSizeByCamera(width);
        height = this.offsetSizeByCamera(height);
        this.ctx.fillRect(x, y, width, height);
    }

    fillCircle(cx: number, cy: number, radius: number): void {
        if (
            !this.usingCameraCoords &&
            !this.camera.isCircleVisible(cx, cy, radius)
        ) {
            return;
        }
        cx = this.offsetXByCamera(cx);
        cy = this.offsetYByCamera(cy);
        radius = this.offsetSizeByCamera(radius);
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    strokeLine(
        x0: number,
        y0: number,
        x1: number,
        y1: number,
        width = 1,
    ): void {
        if (
            !this.usingCameraCoords &&
            !this.camera.isLineVisible(x0, y0, x1, y1, width)
        ) {
            return;
        }
        x0 = this.offsetXByCamera(x0);
        x1 = this.offsetXByCamera(x1);
        y0 = this.offsetYByCamera(y0);
        y1 = this.offsetYByCamera(y1);
        width = this.offsetSizeByCamera(width);
        this.ctx.lineWidth = width;
        this.ctx.beginPath();
        this.ctx.moveTo(x0, y0);
        this.ctx.lineTo(x1, y1);
        this.ctx.stroke();
    }

    fillText(
        text: string,
        {x, y, color = Color.WHITE, shadowColor}: ShadowTextOpts,
    ): void {
        x = this.offsetXByCamera(x);
        y = this.offsetYByCamera(y);
        if (shadowColor) {
            this.setFillColor(shadowColor);
            const offsetX = BASE_FONT_SIZE / 10;
            this.ctx.fillText(text, x - offsetX, y);
        }
        this.setFillColor(color);
        this.ctx.fillText(text, x, y);
    }

    fillMultilineText(textRows: string[], opts: ShadowTextOpts): void {
        for (const [index, text] of textRows.entries()) {
            const lineY = opts.y + BASE_FONT_SIZE * index;
            this.fillText(text, {...opts, y: lineY});
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
        if (
            !this.usingCameraCoords &&
            !this.camera.isRectVisible(dx, dy, dw, dh)
        ) {
            return;
        }
        // drawImage(image: CanvasImageSource, dx: number, dy: number): void;
        // drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void;
        // drawImage(image: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
        dx = this.offsetXByCamera(dx);
        dy = this.offsetYByCamera(dy);
        dw = this.offsetSizeByCamera(dw);
        dh = this.offsetSizeByCamera(dh);
        this.ctx.drawImage(src, sx, sy, sw, sh, dx, dy, dw, dh);
    }

    getImageData(
        x: number,
        y: number,
        width: number,
        height: number,
    ): ImageData {
        x = this.offsetXByCamera(x);
        y = this.offsetYByCamera(y);
        // TODO: this should be fixed
        width = this.offsetSizeByCamera(width);
        height = this.offsetSizeByCamera(height);
        const imageData = this.ctx.getImageData(x, y, width, height);
        return imageData;
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

    resizeCanvasByWindow(window: Window): void {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.resizeCanvas(width, height);
    }

    private resizeCanvas(width: number, height: number): void {
        this.canvas.style.width = '';
        this.canvas.style.height = '';
        this.canvas.width = width;
        this.canvas.height = height;
        this.camera.screenSize.set(width, height);
    }

    async toggleFullscreen(window: Window): Promise<void> {
        const document = window.document;
        if (!document.fullscreenEnabled) {
            console.warn('Fullscreen is either not supported or disabled');
            return;
        }
        if (document.fullscreenElement) {
            await document.exitFullscreen().catch((err) => {
                throw wrapError(err, 'ERROR: failed to exit Fullscreen');
            });
        } else {
            const appElement = document.getElementById(APP_ELEMENT_ID);
            assert(appElement);
            await appElement.requestFullscreen().catch((err) => {
                throw wrapError(err, 'ERROR: failed to enter Fullscreen');
            });
        }
    }

    private offsetXByCamera(x: number): number {
        if (this.usingCameraCoords) return x;
        const result =
            (x - this.camera.worldOffset.x) * this.camera.scale +
            this.camera.screenSize.width / 2;
        assert(!isNaN(result));
        return result;
    }

    private offsetYByCamera(y: number): number {
        if (this.usingCameraCoords) return y;
        const result =
            (y - this.camera.worldOffset.y) * this.camera.scale +
            this.camera.screenSize.height / 2;
        assert(!isNaN(result));
        return result;
    }

    private offsetSizeByCamera(size: number): number {
        if (this.usingCameraCoords) {
            return size;
        }
        const result = size * this.camera.scale;
        return result;
    }
}
