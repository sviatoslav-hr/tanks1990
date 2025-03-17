import {Color} from '#/color';
import {CELL_SIZE} from '#/const';
import {Entity} from '#/entity/core';
import {Sprite, createStaticSprite} from '#/entity/sprite';
import {Rect, randomInt} from '#/math';
import {Duration} from '#/math/duration';
import {Renderer} from '#/renderer';
import {EntityManager} from './manager';

export function generateBlocks(manager: EntityManager): Block[] {
    const world = manager.world;
    // NOTE: no blocks in inifinite mode for now.
    if (world.isInfinite) return [];

    const blocks: Block[] = [];
    const BLOCKS_COUNT = 9;
    for (let i = 0; i < BLOCKS_COUNT; i++) {
        const x = world.boundary.x + randomInt(1, world.boundary.width / CELL_SIZE - 1) * CELL_SIZE;
        const y =
            world.boundary.y + randomInt(1, world.boundary.height / CELL_SIZE - 1) * CELL_SIZE;
        const sprite = createStaticSprite({
            key: 'bricks',
            frameWidth: 64,
            frameHeight: 64,
        });
        const block = new Block(manager, {
            x,
            y,
            width: CELL_SIZE,
            height: CELL_SIZE,
            texture: sprite,
        });
        blocks.push(block);
    }

    return blocks;
}

export type BlockOpts = Rect & {
    texture: Color | Sprite<'static'>;
};

export class Block extends Entity {
    public readonly dead = false;
    private readonly color: Color = Color.WHITE;
    private readonly sprite?: Sprite<string>;

    constructor(manager: EntityManager, {x, y, width, height, texture}: BlockOpts) {
        super(manager);
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
