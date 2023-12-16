import { type Color } from "./color";

export class Context {
    constructor(private ctx: CanvasRenderingContext2D) {
        if (ctx == null) {
            throw new Error("No context found");
        }
    }

    drawRect(x: number, y: number, width: number, height: number): void {
        this.ctx.fillRect(x, y, width, height);
    }

    drawText(text: string, x: number, y: number): void {
        this.ctx.fillText(text, x, y);
    }

    setFont(font: string): void {
        this.ctx.font = font;
        this.ctx.textBaseline = "top";
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
