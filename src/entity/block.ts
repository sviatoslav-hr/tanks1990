import { Color } from "../color";
import { Context } from "../context";
import { Rect } from "../math";
import { Entity } from "./core";

export type BlockOpts = Rect & {
    color: Color;
};

export class Block implements Entity {
    public x = 0;
    public y = 0;
    public width = 50;
    public height = 50;
    private readonly color: Color = Color.WHITE;

    constructor({ x, y, width, height, color }: BlockOpts) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
    }

    update(_: number): void {}

    draw(ctx: Context): void {
        ctx.setFillColor(this.color);
        ctx.drawRect(this.x, this.y, this.width, this.height);
    }
}
