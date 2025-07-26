import {EntityId, newEntityId} from '#/entity/id';
import {EntityManager} from '#/entity/manager';
import {Rect, clamp, isPosInsideRect, xn, yn} from '#/math';
import {Direction} from '#/math/direction';
import {Room} from '#/world/room';

export class Entity implements Rect {
    readonly id: EntityId = newEntityId();
    public dead = false;
    public x = 0;
    public y = 0;
    public width = 0;
    public height = 0;
    public room: Room;
    // NOTE: Negative values indicate that the entity is invisible.
    public health = -1;
    public DEBUG_collidedCount = 0;

    constructor(protected manager: EntityManager) {
        this.room = manager.world.activeRoom;
    }

    equals(other: Entity): boolean {
        return this.id === other.id;
    }
}

export function isOutsideRect(entity: Rect, boundary: Rect): boolean {
    return (
        entity.x < boundary.x ||
        entity.y < boundary.y ||
        xn(entity) > xn(boundary) ||
        yn(entity) > yn(boundary)
    );
}

export function isIntesecting(a: Rect, b: Rect, allowEquals = true): boolean {
    if (allowEquals) {
        return (
            a.x <= b.x + b.width &&
            a.x + a.width >= b.x &&
            a.y <= b.y + b.height &&
            a.y + a.height >= b.y
        );
    } else {
        return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
        );
    }
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
    entity.x = clamp(entity.x, boundary.x, boundary.x + boundary.width - entity.width);
    entity.y = clamp(entity.y, boundary.y, boundary.y + boundary.height - entity.height);
}

export function moveEntity(entity: Rect, offset: number, direction: Direction): void {
    switch (direction) {
        case Direction.NORTH:
            entity.y -= offset;
            break;
        case Direction.SOUTH:
            entity.y += offset;
            break;
        case Direction.EAST:
            entity.x += offset;
            break;
        case Direction.WEST:
            entity.x -= offset;
            break;
    }
}

export function isSameEntity(a: Entity, b: Entity): boolean {
    return a.id === b.id;
}
