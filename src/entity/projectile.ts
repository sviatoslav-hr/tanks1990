import { Tank } from '.';
import { CELL_SIZE } from '../const';
import { Context } from '../context';
import { Game } from '../game';
import { Rect } from '../math';
import {
    Direction,
    Entity,
    isIntesecting,
    isOutsideRect,
    moveEntity,
    scaleMovement,
} from './core';
import { Sprite } from './sprite';
import {Duration} from "../math/duration.ts";

export class Projectile implements Entity {
    public static SIZE = CELL_SIZE / 5;
    public dead = false;
    public width: number;
    public height: number;
    private readonly v = 800;
    private readonly sprite = new Sprite({
        key: 'bullet',
        frameWidth: 16,
        frameHeight: 16,
        frameDuration: Duration.milliseconds(100),
        states: [{ name: 'moving', frames: 2 }],
    });

    constructor(
        public x: number,
        public y: number,
        size: number,
        private game: Game,
        private owner: Tank,
        private boundary: Rect,
        public direction: Direction,
    ) {
        this.width = size;
        this.height = size;
    }

    update(dt: Duration): void {
        if (this.dead) {
            return;
        }
        this.sprite.update(dt);
        if (isOutsideRect(this, this.boundary)) {
            this.dead = true;
        } else {
            moveEntity(this, scaleMovement(this.v, dt), this.direction);
            for (const entity of this.game.entities) {
                if (entity === this || entity === this.owner || entity.dead) {
                    continue;
                }
                if (isIntesecting(this, entity)) {
                    this.dead = true;
                    if (entity instanceof Projectile) {
                        entity.dead = true;
                    }
                    if (entity instanceof Tank && !entity.dead) {
                        this.owner.doDamage(entity);
                    }
                }
            }
        }
    }

    draw(ctx: Context): void {
        if (!this.dead) {
            this.sprite.draw(ctx, this, this.direction);
        }
    }

    reviveAt(x: number, y: number): void {
        this.x = x;
        this.y = y;
        this.dead = false;
        this.direction = Direction.UP;
        this.sprite.reset();
    }
}
