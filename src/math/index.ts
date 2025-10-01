import {Direction} from '#/math/direction';
import {random} from '#/math/rng';
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

export function sameSign(a: number, b: number): boolean {
    return (a ^ b) >= 0;
}

/** Parabolic curve peaking at t = 0.5 */
export function bellCurveInterpolate(min: number, max: number, t: number): number {
    return min + (max - min) * (4 * t * (1 - t));
}

export function rotateRect(rect: Rect, cx: number, cy: number, deg: 0 | 90 | 180 | 270): Rect {
    if (deg === 0) {
        return rect;
    }
    if (![0, 90, 180, 270].includes(deg)) {
        logger.warn('this rotation degree is not currently supported');
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

export function scaleRectCentered(rect: Rect, scale: number): Rect {
    const {x, y, width, height} = rect;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    const scaledX = cx - scaledWidth / 2;
    const scaledY = cy - scaledHeight / 2;
    return {
        x: scaledX,
        y: scaledY,
        width: scaledWidth,
        height: scaledHeight,
    };
}

export function isPosInsideRect(x: number, y: number, rect: Rect, offset = 0): boolean {
    // TODO: Why flooring it?
    // x = Math.floor(x);
    // y = Math.floor(y);
    // return (
    //     Math.floor(rect.x) <= x &&
    //     x <= Math.floor(xn(rect)) &&
    //     Math.floor(rect.y) <= y &&
    //     y <= Math.floor(yn(rect))
    // );
    return (
        rect.x - offset <= x &&
        x <= xn(rect) + offset &&
        rect.y - offset <= y &&
        y <= yn(rect) + offset
    );
}

export function oppositeDirection(dir: Direction): Direction {
    switch (dir) {
        case Direction.NORTH:
            return Direction.SOUTH;
        case Direction.EAST:
            return Direction.WEST;
        case Direction.SOUTH:
            return Direction.NORTH;
        case Direction.WEST:
            return Direction.EAST;
    }
}

function rotatePoint(x: number, y: number, cx: number, cy: number, deg: number): [number, number] {
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

export function moveToRandomCorner(entity: Rect, boundary: Rect, offset = 1): void {
    switch (random.selectFrom(0, 1, 2, 3)) {
        case 0: {
            entity.x = boundary.x + offset;
            entity.y = boundary.y + offset;
            break;
        }
        case 1: {
            entity.x = xn(boundary) - entity.width - offset;
            entity.y = boundary.y + offset;
            break;
        }
        case 2: {
            entity.x = xn(boundary) - entity.width - offset;
            entity.y = yn(boundary) - entity.height - offset;
            break;
        }
        case 3: {
            entity.x = boundary.x + offset;
            entity.y = yn(boundary) - entity.height - offset;
            break;
        }
    }
}

export const GRAVITY = 9.81; // in m/s^2

export function getRectCenter(rect: Rect): Vector2Like {
    const x = rect.x + rect.width / 2;
    const y = rect.y + rect.height / 2;
    return {x, y};
}
