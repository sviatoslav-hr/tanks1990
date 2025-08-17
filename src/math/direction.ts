import {Vector2Like} from '#/math/vector';

export enum Direction {
    NORTH = 'north',
    EAST = 'east',
    SOUTH = 'south',
    WEST = 'west',
}

export const ALL_DIRECTIONS = [Direction.NORTH, Direction.EAST, Direction.SOUTH, Direction.WEST];

export function getDirectionAngle(direction: Direction): number {
    switch (direction) {
        case Direction.NORTH:
            return 0;
        case Direction.EAST:
            return 90;
        case Direction.SOUTH:
            return 180;
        case Direction.WEST:
            return 270;
    }
}

export function getOppositeDirection(direction: Direction): Direction {
    switch (direction) {
        case Direction.NORTH:
            return Direction.SOUTH;
        case Direction.SOUTH:
            return Direction.NORTH;
        case Direction.EAST:
            return Direction.WEST;
        case Direction.WEST:
            return Direction.EAST;
    }
}

export function getDirectionBetween(source: Vector2Like, target: Vector2Like): Direction | null {
    if (source.x === target.x) {
        if (source.y < target.y) return Direction.SOUTH;
        if (source.y > target.y) return Direction.NORTH;
    } else if (source.y === target.y) {
        if (source.x < target.x) return Direction.EAST;
        if (source.x > target.x) return Direction.WEST;
    }
    return null; // Not aligned horizontally or vertically
}
