import { Color } from '../color';
import { Context } from '../context';
import { Rect } from '../math';
import { Entity } from './core';
import { Sprite } from './sprite';

export type BlockOpts = Rect & {
    texture: Color | Sprite<'static'>;
};

export class Block implements Entity {
    public x = 0;
    public y = 0;
    public width = 50;
    public height = 50;
    public readonly dead = false;
    private readonly color: Color = Color.WHITE;
    private readonly sprite?: Sprite<string>;

    constructor({ x, y, width, height, texture }: BlockOpts) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        if (texture instanceof Sprite) {
            this.sprite = texture;
        } else {
            this.color = texture;
        }
    }

    update(dt: number): void {
        this.sprite?.update(dt);
    }

    draw(ctx: Context): void {
        if (this.sprite) {
            this.sprite.draw(ctx, this);
        } else {
            ctx.setFillColor(this.color);
            ctx.drawRect(this.x, this.y, this.width, this.height);
        }
    }
}
