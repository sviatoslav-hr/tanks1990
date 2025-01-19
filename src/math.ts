import {Direction} from '#/entity/core';
import {Vector2Like} from '#/math/vector';

export type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export function xn(rect: Rect): number {
    return rect.x + rect.width;
}

export function fmod(x: number, y: number): number {
    return x - y * Math.floor(x / y);
}

export function yn(rect: Rect): number {
    return rect.y + rect.height;
}

export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

export function lerp(a: number, b: number, t: number): number {
    assert(t >= 0 && t <= 1);
    return a + (b - a) * t;
}

/** Parabolic curve peaking at t = 0.5 */
export function bellCurveInterpolate(
    min: number,
    max: number,
    t: number,
): number {
    return min + (max - min) * (4 * t * (1 - t));
}

export function rotateRect(
    rect: Rect,
    cx: number,
    cy: number,
    deg: 0 | 90 | 180 | 270,
): Rect {
    if (deg === 0) {
        return rect;
    }
    if (![0, 90, 180, 270].includes(deg)) {
        console.warn('this rotation degree is not currently supported');
        return rect;
    }
    const {x, y, width, height} = rect;
    const [nx, ny] = rotatePoint(x + width / 2, y + height / 2, cx, cy, deg);
    // NOTE: this is a bit scuft, but for now I want to rotate a tank only using a single point.
    const swap = deg === 90 || deg === 270;
    return {
        x: nx - (swap ? height : width) / 2,
        y: ny - (swap ? width : height) / 2,
        width: swap ? height : width,
        height: swap ? width : height,
    };
}

export function isPosInsideRect(x: number, y: number, rect: Rect): boolean {
    x = Math.floor(x);
    y = Math.floor(y);
    return (
        Math.floor(rect.x) <= x &&
        x <= Math.floor(xn(rect)) &&
        Math.floor(rect.y) <= y &&
        y <= Math.floor(yn(rect))
    );
}

export function oppositeDirection(dir: Direction): Direction {
    switch (dir) {
        case Direction.UP:
            return Direction.DOWN;
        case Direction.RIGHT:
            return Direction.LEFT;
        case Direction.DOWN:
            return Direction.UP;
        case Direction.LEFT:
            return Direction.RIGHT;
    }
}

function rotatePoint(
    x: number,
    y: number,
    cx: number,
    cy: number,
    deg: number,
): [number, number] {
    const radians = toRadians(deg),
        cos = Math.cos(radians),
        sin = Math.sin(radians),
        nx = cos * (x - cx) - sin * (y - cy) + cx,
        ny = cos * (y - cy) + sin * (x - cx) + cy;
    return [nx, ny];
}

export function toRadians(deg: number): number {
    return (Math.PI / 180) * deg;
}

export function toDegrees(deg: number): number {
    return (deg * 180) / Math.PI;
}

export function numround(value: number, margin: number = 0): number {
    const n = 10 ** margin;
    return Math.round(value * n) / n;
}

export function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min) + min);
}

export function randomFrom<T>(...values: T[]): T {
    return values[randomInt(0, values.length)]!;
}

export function moveToRandomCorner(entity: Rect, boundary: Rect): void {
    switch (randomFrom(0, 1, 2, 3)) {
        case 0: {
            entity.x = 0;
            entity.y = 0;
            break;
        }
        case 1: {
            entity.x = xn(boundary) - entity.width;
            entity.y = 0;
            break;
        }
        case 2: {
            entity.x = xn(boundary) - entity.width;
            entity.y = yn(boundary) - entity.height;
            break;
        }
        case 3: {
            entity.x = 0;
            entity.y = yn(boundary) - entity.height;
            break;
        }
    }
}

export function distanceV2(v1: Vector2Like, v2: Vector2Like): number {
    return Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2);
}

export const GRAVITY = 9.81; // in m/s^2
