import { Tank } from '.';
import { CELL_SIZE } from '../const';
import { Context } from '../context';
import { Duration } from '../math/duration';
import { World } from '../world.ts';
import {
    Direction,
    Entity,
    isIntesecting,
    isOutsideRect,
    moveEntity,
    scaleMovement,
} from './core';
import { Sprite } from './sprite';

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
        private world: World,
        private owner: Tank,
        public direction: Direction,
    ) {
        this.width = size;
        this.height = size;
    }

    static spawn(
        owner: Tank,
        world: World,
        x: number,
        y: number,
        direction: Direction,
    ): Projectile {
        const deadProjectile = world.projectiles.find((p) => p.dead);
        if (deadProjectile) {
            // NOTE: reuse dead projectiles instead of creating new ones
            deadProjectile.reviveAt(owner, x, y);
            deadProjectile.direction = direction;
            return deadProjectile;
        }
        const size = Projectile.SIZE;
        const projectile = new Projectile(
            x - size / 2,
            y - size / 2,
            size,
            world,
            owner,
            direction,
        );
        // TODO: measure if dead projectiles should be cleaned up at some point
        world.projectiles.push(projectile);
        return projectile;
    }

    update(dt: Duration): void {
        if (this.dead) {
            return;
        }
        this.sprite.update(dt);
        if (isOutsideRect(this, this.world.screen)) {
            this.dead = true;
        } else {
            moveEntity(this, scaleMovement(this.v, dt), this.direction);
            for (const entity of this.world.iterateEntities()) {
                if (entity === this || entity === this.owner || entity.dead) {
                    continue;
                }
                if (isIntesecting(this, entity)) {
                    this.dead = true;
                    if (entity instanceof Projectile) {
                        entity.dead = true;
                    }
                    if (entity instanceof Tank) {
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

    reviveAt(ownder: Tank, x: number, y: number): void {
        this.owner = ownder;
        this.x = x;
        this.y = y;
        this.dead = false;
        this.direction = Direction.UP;
        this.sprite.reset();
    }
}
