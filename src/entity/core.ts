import {EntityId, newEntityId} from '#/entity/id';
import {Rect, clamp, isPosInsideRect, xn, yn} from '#/math';
import {Duration} from '#/math/duration';
import {Vector2Like} from '#/math/vector';
import {EntityManager} from '#/entity/manager';

export class Entity implements Rect {
    readonly id: EntityId = newEntityId();
    public dead = false;
    public x = 0;
    public y = 0;
    public width = 0;
    public height = 0;

    constructor(protected manager: EntityManager) {}

    equals(other: Entity): boolean {
        return this.id === other.id;
    }
}

export enum Direction {
    NORTH = 0,
    EAST = 90,
    SOUTH = 180,
    WEST = 270,
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

export function isInside(rect: Rect, bounds: Rect): boolean {
    // NOTE: checks if any corner of `rect` is inside of `other`
    return (
        isPosInsideRect(rect.x, rect.y, bounds) &&
        isPosInsideRect(xn(rect), rect.y, bounds) &&
        isPosInsideRect(rect.x, yn(rect), bounds) &&
        isPosInsideRect(xn(rect), yn(rect), bounds)
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

export function getMovement(value: number, direction: Direction): Vector2Like {
    const vec: Vector2Like = {x: 0, y: 0};
    switch (direction) {
        case Direction.NORTH:
            vec.y -= value;
            break;
        case Direction.SOUTH:
            vec.y += value;
            break;
        case Direction.EAST:
            vec.x += value;
            break;
        case Direction.WEST:
            vec.x -= value;
            break;
    }
    return vec;
}

export function scaleMovement(movement: number, dt: Duration): number {
    return movement * dt.seconds;
}
