import {clamp, numround} from '#/math';

export class Vector2 implements Vector2Like {
    constructor(
        public x: number,
        public y: number,
    ) {}

    static create(x: number, y: number): Vector2 {
        return new Vector2(x, y);
    }

    static zero(): Vector2 {
        return new Vector2(0, 0);
    }

    static from(v: Vector2Like): Vector2 {
        return new Vector2(v.x, v.y);
    }

    get width(): number {
        return this.x;
    }

    get height(): number {
        return this.y;
    }

    set width(value: number) {
        this.x = value;
    }

    set height(value: number) {
        this.y = value;
    }

    set(x: number, y: number): Vector2 {
        this.x = x;
        this.y = y;
        return this;
    }

    setFrom(v: Vector2Like): Vector2 {
        this.x = v.x;
        this.y = v.y;
        return this;
    }

    setScalar(s: number): Vector2 {
        this.x = s;
        this.y = s;
        return this;
    }

    min(v: Vector2Like): Vector2;
    min(x: number, y: number): Vector2;
    min(vOrX: Vector2Like | number, y?: number): Vector2 {
        if (typeof vOrX === 'number') {
            assert(typeof y === 'number');
            this.x = Math.min(this.x, vOrX);
            this.y = Math.min(this.y, y);
            return this;
        }
        this.x = Math.min(this.x, vOrX.x);
        this.y = Math.min(this.y, vOrX.y);
        return this;
    }

    max(v: Vector2Like): Vector2;
    max(x: number, y: number): Vector2;
    max(vOrX: Vector2Like | number, y?: number): Vector2 {
        if (typeof vOrX === 'number') {
            assert(typeof y === 'number');
            this.x = Math.max(this.x, vOrX);
            this.y = Math.max(this.y, y);
            return this;
        }
        this.x = Math.max(this.x, vOrX.x);
        this.y = Math.max(this.y, vOrX.y);
        return this;
    }

    addXY(x: number, y: number): Vector2 {
        this.x += x;
        this.y += y;
        return this;
    }

    add(v: Vector2Like): Vector2 {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    sub(v: Vector2Like): Vector2 {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    multiply(v: Vector2Like): Vector2 {
        this.x *= v.x;
        this.y *= v.y;
        return this;
    }

    multiplyScalar(v: number): Vector2 {
        this.x *= v;
        this.y *= v;
        return this;
    }

    divide(v: Vector2Like): Vector2 {
        this.x /= v.x;
        this.y /= v.y;
        return this;
    }

    divideScalar(v: number): Vector2 {
        this.x /= v;
        this.y /= v;
        return this;
    }

    negate(condition?: boolean): Vector2 {
        if (condition === undefined || condition) {
            this.x = -this.x;
            this.y = -this.y;
        }
        return this;
    }

    floor(): Vector2 {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        return this;
    }

    round(margin?: number): Vector2 {
        this.x = numround(this.x, margin);
        this.y = numround(this.y, margin);
        return this;
    }

    clone(): Vector2 {
        return new Vector2(this.x, this.y);
    }

    dot(v: Vector2Like): number {
        return this.x * v.x + this.y * v.y;
    }

    length(): number {
        return Math.hypot(this.x, this.y);
    }

    lengthSquared(): number {
        return this.x * this.x + this.y * this.y;
    }

    distanceTo(v: Vector2Like): number {
        return Math.hypot(this.x - v.x, this.y - v.y);
    }

    distanceToSquared(v: Vector2Like): number {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return dx * dx + dy * dy;
    }

    manhattanDistanceTo(v: Vector2Like): number {
        return Math.abs(this.x - v.x) + Math.abs(this.y - v.y);
    }

    angle(): number {
        // computes the angle in radians with respect to the positive x-axis
        return Math.atan2(-this.y, -this.x) + Math.PI;
    }

    angleTo(v: Vector2Like) {
        const denominator = Math.sqrt(
            this.lengthSquared() * Vector2.prototype.lengthSquared.call(v),
        );
        if (denominator === 0) return Math.PI / 2;

        const theta = this.dot(v) / denominator;
        Math.acos(clamp(theta, -1, 1));
        return Math.acos(theta);
    }

    normalize(): Vector2 {
        return this.divideScalar(this.length() || 1);
    }

    equals(v: Vector2Like): boolean {
        return this.x === v.x && this.y === v.y;
    }

    toString(): string {
        return `Vector2(${this.x};${this.y})`;
    }
}

export interface Vector2Like {
    x: number;
    y: number;
}

export function v2AddMut(a: Vector2Like, b: Vector2Like): Vector2Like {
    a.x += b.x;
    a.y += b.y;
    return a;
}

export function v2Equals(a: Vector2Like, b: Vector2Like): boolean {
    return a.x === b.x && a.y === b.y;
}

export function v2ManhattanDistance(a: Vector2Like, b: Vector2Like): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
