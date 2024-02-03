import { Tank } from ".";
import { Color } from "../color";
import { Context } from "../context";
import { Game } from "../game";
import { Rect } from "../math";
import { Block } from "./block";
import {
    Direction,
    Entity,
    isIntesecting,
    isOutsideRect,
    moveEntity,
    scaleMovement,
} from "./core";

export class Projectile implements Entity {
    public dead = false;
    private readonly box: Block;
    private readonly v = 700;

    constructor(
        x: number,
        y: number,
        size: number,
        private game: Game,
        private owner: Tank,
        private boundary: Rect,
        private direction: Direction,
    ) {
        this.box = new Block({
            x,
            y,
            width: size,
            height: size,
            color: Color.ORANGE_PHILIPPINE,
        });
    }

    get x(): number {
        return this.box.x;
    }

    set x(x: number) {
        this.box.x = x;
    }

    get y(): number {
        return this.box.y;
    }

    set y(y: number) {
        this.box.y = y;
    }

    get width(): number {
        return this.box.width;
    }

    set width(w: number) {
        this.box.width = w;
    }

    get height(): number {
        return this.box.width;
    }

    set height(h: number) {
        this.box.height = h;
    }

    update(dt: number): void {
        if (this.dead) {
            return;
        }
        if (isOutsideRect(this.box, this.boundary)) {
            this.dead = true;
        } else {
            moveEntity(this.box, scaleMovement(this.v, dt), this.direction);
            for (const entity of this.game.entities) {
                if (entity === this || entity === this.owner || entity.dead) {
                    continue;
                }
                if (isIntesecting(this.box, entity)) {
                    this.dead = true;
                    if (entity instanceof Projectile) {
                        entity.dead = true;
                    }
                    if (entity instanceof Tank && !entity.dead) {
                        this.owner.doDamage(entity);
                    }
                }
            }
            this.box.update(dt);
        }
    }

    draw(ctx: Context): void {
        if (!this.dead) {
            this.box.draw(ctx);
        }
    }

    reviveAt(x: number, y: number): void {
        this.x = x;
        this.y = y;
        this.dead = false;
    }
}
