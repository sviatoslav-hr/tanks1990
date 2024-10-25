import { Context } from '../context';
import { Rect, Vec2, clamp, isPosInsideRect, xn, yn } from '../math';
import { Duration } from '../math/duration.ts';

export type Entity = {
    dead: boolean;
    update(dt: Duration): void;
    draw(ctx: Context): void;
} & Rect;

export enum Direction {
    UP = 0,
    RIGHT = 90,
    DOWN = 180,
    LEFT = 270,
}

export function isOutsideRect(entity: Rect, boundary: Rect): boolean {
    return (
        entity.x < boundary.x ||
        entity.y < boundary.y ||
        xn(entity) > xn(boundary) ||
        yn(entity) > yn(boundary)
    );
}

export function isIntesecting(rect: Rect, other: Rect): boolean {
    // NOTE: checks if any corner of `rect` is inside of `other`
    return (
        isPosInsideRect(rect.x, rect.y, other) ||
        isPosInsideRect(xn(rect), rect.y, other) ||
        isPosInsideRect(rect.x, yn(rect), other) ||
        isPosInsideRect(xn(rect), yn(rect), other)
    );
}

export function clampByBoundary(entity: Rect, boundary: Rect): void {
    entity.x = clamp(
        entity.x,
        boundary.x,
        boundary.x + boundary.width - entity.width,
    );
    entity.y = clamp(
        entity.y,
        boundary.y,
        boundary.y + boundary.height - entity.height,
    );
}

export function moveEntity(
    entity: Rect,
    value: number,
    direction: Direction,
): void {
    const movement = getMovement(value, direction);
    entity.x += movement.x;
    entity.y += movement.y;
}

export function getMovement(value: number, direction: Direction): Vec2 {
    const vec: Vec2 = { x: 0, y: 0 };
    switch (direction) {
        case Direction.UP:
            vec.y -= value;
            break;
        case Direction.DOWN:
            vec.y += value;
            break;
        case Direction.RIGHT:
            vec.x += value;
            break;
        case Direction.LEFT:
            vec.x -= value;
            break;
    }
    return vec;
}

export function scaleMovement(movement: number, dt: Duration): number {
    return movement * (dt.milliseconds / 1000);
}
