import { type Color } from "./color";
import { Rect } from "./math";

export class Context {
    constructor(private ctx: CanvasRenderingContext2D) {
        if (ctx == null) {
            throw new Error("No context found");
        }
    }

    drawBoundary({ x, y, width, height }: Rect): void {
        this.drawLine(x, y, x + width, y);
        this.drawLine(x + width, y, x + width, y + height);
        this.drawLine(x + width, y + height, x, y + height);
        this.drawLine(x, y + height, x, y);
    }

    drawRect2({ x, y, width, height }: Rect): void {
        this.ctx.fillRect(x, y, width, height);
    }

    drawRect(x: number, y: number, width: number, height: number): void {
        this.ctx.fillRect(x, y, width, height);
    }

    drawLine(x0: number, y0: number, x1: number, y1: number): void {
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x0, y0);
        this.ctx.lineTo(x1, y1);
        this.ctx.stroke();
    }

    drawText(text: string, x: number, y: number): void {
        this.ctx.fillText(text, x, y);
    }

    setFont(font: string): void {
        this.ctx.font = font;
        this.ctx.textBaseline = "top";
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

    clearScreen(): void {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }
}
