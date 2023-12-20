import { Color } from "../color";
import { Context } from "../context";
import { Rect } from "../math";
import { STATE } from "../state";
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
    static readonly SIZE = 8;

    constructor(
        x: number,
        y: number,
        private boundary: Rect,
        private direction: Direction,
    ) {
        this.box = new Block({
            x,
            y,
            width: Projectile.SIZE,
            height: Projectile.SIZE,
            color: Color.RED,
        });
    }

    get x(): number {
        return this.box.x;
    }

    get y(): number {
        return this.box.y;
    }

    update(dt: number): void {
        if (this.dead) {
            return;
        }
        if (isOutsideRect(this.box, this.boundary)) {
            this.dead = true;
        } else {
            moveEntity(this.box, scaleMovement(this.v, dt), this.direction);
            for (const tank of STATE.tanks) {
                if (isIntesecting(this.box, tank)) {
                    this.dead = true;
                    tank.dead = true;
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
