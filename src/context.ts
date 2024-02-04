import { Color } from "./color";
import { BASE_FONT_SIZE } from "./const";
import { Rect } from "./math";
import { Transform } from "./math/transform";

type ShadowTextOpts = {
    x: number;
    y: number;
    color?: Color;
    shadowColor?: Color;
};

export class Context {
    constructor(public ctx: CanvasRenderingContext2D) {}

    drawBoundary({ x, y, width, height }: Rect, lineWidth = 1): void {
        this.drawLine(x, y, x + width, y, lineWidth);
        this.drawLine(x + width, y, x + width, y + height, lineWidth);
        this.drawLine(x + width, y + height, x, y + height, lineWidth);
        this.drawLine(x, y + height, x, y, lineWidth);
    }

    drawRect2({ x, y, width, height }: Rect): void {
        this.ctx.fillRect(x, y, width, height);
    }

    drawRect(x: number, y: number, width: number, height: number): void {
        this.ctx.fillRect(x, y, width, height);
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
        { x, y, color = Color.WHITE, shadowColor }: ShadowTextOpts,
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
            this.drawText(text, { ...opts, y: lineY });
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

    setTransform(transform: Transform): void {
        const { a, b, c, d, e, f } = transform;
        this.ctx.setTransform(a, b, c, d, e, f);
    }

    resetTransform(): void {
        this.setTransform(Transform.makeCrear());
    }

    setFont(
        font: string,
        align: CanvasTextAlign = "start",
        baseline: CanvasTextBaseline = "top",
    ): void {
        this.ctx.font = font;
        this.ctx.textBaseline = baseline;
        this.ctx.textAlign = align;
    }

    setStrokeColor(color: Color) {
        if (this.ctx.strokeStyle !== color) {
            this.ctx.strokeStyle = color;
        }
    }

    setFillColor(color: Color) {
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

    clearScreen(): void {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }
}
