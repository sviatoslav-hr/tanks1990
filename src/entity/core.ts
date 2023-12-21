import { Context } from "../context";
import { Rect, clamp } from "../math";

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

export function isIntesecting(entity: Rect, boundary: Rect): boolean {
    const { x: xb0, y: yb0 } = boundary;
    const xb1 = xb0 + boundary.width,
        yb1 = yb0 + boundary.height;
    const { x: x0, y: y0 } = entity;
    const x1 = x0 + entity.width,
        y1 = y0 + entity.height;
    return xb0 <= x0 && x1 <= xb1 && yb0 <= y0 && y1 <= yb1;
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
