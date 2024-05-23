import { Context } from '../context';
import { Rect, clamp, isPosInsideRect, xn, yn } from '../math';

export type Entity = {
    dead: boolean;
    update(dt: number): void;
    draw(ctx: Context): void;
} & Rect;

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

export function scaleMovement(movement: number, dt: number): number {
    return movement * (dt / 1000);
}
