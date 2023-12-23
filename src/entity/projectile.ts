import { Tank } from ".";
import { Color } from "../color";
import { Context } from "../context";
import { Rect } from "../math";
import { State } from "../state";
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

    get y(): number {
        return this.box.y;
    }

    get width(): number {
        return this.box.width;
    }

    get height(): number {
        return this.box.width;
    }

    update(dt: number): void {
        if (this.dead) {
            return;
        }
        if (isOutsideRect(this.box, this.boundary)) {
            this.dead = true;
        } else {
            moveEntity(this.box, scaleMovement(this.v, dt), this.direction);
            for (const entity of State.entities) {
                if (entity === this || entity === this.owner) continue;
                if (isIntesecting(this.box, entity)) {
                    this.dead = true;
                    if (entity instanceof Tank) {
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
}
