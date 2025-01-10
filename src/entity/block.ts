import {Color} from '#/color';
import {Entity} from '#/entity/core';
import {Sprite} from '#/entity/sprite';
import {Rect} from '#/math';
import {Duration} from '#/math/duration';
import {Renderer} from '#/renderer';

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

    constructor({x, y, width, height, texture}: BlockOpts) {
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

    update(dt: Duration): void {
        this.sprite?.update(dt);
    }

    draw(renderer: Renderer): void {
        if (this.sprite) {
            this.sprite.draw(renderer, this);
        } else {
            renderer.setFillColor(this.color);
            renderer.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}
