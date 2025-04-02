import {Color} from '#/color';
import {CELL_SIZE} from '#/const';
import {Entity, isIntesecting} from '#/entity/core';
import {Sprite, createStaticSprite} from '#/entity/sprite';
import {Rect, randomInt} from '#/math';
import {Duration} from '#/math/duration';
import {Renderer} from '#/renderer';
import {isRectOccupied} from '#/world';
import {EntityManager} from './manager';

export function generateBlocks(
    manager: EntityManager,
    boundary: Rect,
    blocksCount: number,
    blockedArea?: Rect,
): Block[] {
    const blocks: Block[] = [];
    const rect: Rect = {
        x: 0,
        y: 0,
        width: CELL_SIZE,
        height: CELL_SIZE,
    };
    const triesLimit = 10;
    outer: for (let i = 0; i < blocksCount; i++) {
        for (let j = 0; j < triesLimit; j++) {
            rect.x = boundary.x + randomInt(1, boundary.width / CELL_SIZE - 1) * CELL_SIZE;
            rect.y = boundary.y + randomInt(1, boundary.height / CELL_SIZE - 1) * CELL_SIZE;
            if (
                !isRectOccupied(rect, manager) &&
                (!blockedArea || !isIntesecting(blockedArea, rect))
            ) {
                break;
            }
            if (j === triesLimit - 1) {
                console.error('Could not find a place for a block');
                break outer;
            }
        }
        const sprite = createStaticSprite({
            key: 'bricks',
            frameWidth: 64,
            frameHeight: 64,
        });

        const block = new Block(manager, {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
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
        if (this.DEBUG_collidedCount > 0) {
            renderer.setStrokeColor(Color.RED);
            renderer.strokeBoundary(this, Math.min(20, this.DEBUG_collidedCount));
        }
    }
}
