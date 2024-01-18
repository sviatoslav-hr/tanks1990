import { type Color } from "./color";
import { Rect } from "./math";

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

    drawText(text: string, x: number, y: number): void {
        this.ctx.fillText(text, x, y);
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

    clearScreen(): void {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }
}
