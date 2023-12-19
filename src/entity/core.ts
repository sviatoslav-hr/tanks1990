import { Context } from "../context";
import { Rect } from "../math";

export type Entity = {
    update(dt: number): void;
    draw(ctx: Context): void;
};

export enum Direction {
    UP = 0,
    RIGHT = 90,
    DOWN = 180,
    LEFT = 270,
}

export function isOutsideRect(entity: Rect, boundary: Rect): boolean {
    const { x, y, width, height } = boundary;
    return (
        entity.x < x ||
        entity.y < y ||
        entity.x + entity.width > x + width ||
        entity.y + entity.height > y + height
    );
}

export function moveEntity(
    entity: Rect,
    value: number,
    direction: Direction,
): void {
    switch (direction) {
        case Direction.UP:
            entity.y -= value;
            break;
        case Direction.DOWN:
            entity.y += value;
            break;
        case Direction.RIGHT:
            entity.x += value;
            break;
        case Direction.LEFT:
            entity.x -= value;
            break;
    }
}
