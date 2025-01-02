import {Camera} from '#/camera';
import {Color} from '#/color';
import {Context} from '#/context';
import {Entity} from '#/entity/core';
import {Sprite} from '#/entity/sprite';
import {Rect} from '#/math';
import {Duration} from '#/math/duration';

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

    draw(ctx: Context, camera: Camera): void {
        if (this.sprite) {
            this.sprite.draw(ctx, this, camera);
        } else {
            ctx.setFillColor(this.color);
            ctx.drawRect(
                this.x - camera.position.x,
                this.y - camera.position.y,
                this.width,
                this.height,
            );
        }
    }
}
