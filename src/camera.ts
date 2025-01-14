import {Vector2} from '#/math/vector';
import {Rect} from '#/math';

export class Camera {
    readonly position: Vector2 = Vector2.zero();
    readonly size: Vector2;
    scale = 1;

    constructor(width: number, height: number) {
        assert(width > 0 && height > 0, 'Invalid camera size');
        this.size = new Vector2(width, height);
    }

    getSizeRect(): Rect {
        return {x: 0, y: 0, width: this.size.x, height: this.size.y};
    }

    centerOn(entity: Rect): void {
        const x = entity.x + entity.width / 2;
        const y = entity.y + entity.height / 2;
        this.position.set(x - this.size.x / 2, y - this.size.y / 2);
    }

    isRectVisible(x: number, y: number, width: number, height: number): boolean;
    isRectVisible(rect: Rect): boolean;
    isRectVisible(
        rectOrX: Rect | number,
        y?: number,
        width?: number,
        height?: number,
    ): boolean {
        if (typeof rectOrX === 'number') {
            assert(
                y != null && width != null && height != null,
                'Invalid arguments',
            );
            return (
                rectOrX + width > this.position.x &&
                rectOrX < this.position.x + this.size.x &&
                y + height > this.position.y &&
                y < this.position.y + this.size.y
            );
        }
        return (
            rectOrX.x + rectOrX.width > this.position.x &&
            rectOrX.x < this.position.x + this.size.x &&
            rectOrX.y + rectOrX.height > this.position.y &&
            rectOrX.y < this.position.y + this.size.y
        );
    }

    isLineVisible(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        lineWidth: number,
    ): boolean {
        return this.isRectVisible(
            Math.min(x1, x2) - lineWidth,
            Math.min(y1, y2) - lineWidth,
            Math.abs(x2 - x1) + lineWidth * 2,
            Math.abs(y2 - y1) + lineWidth * 2,
        );
    }

    isCircleVisible(cx: number, cy: number, radius: number): boolean {
        // TODO: Add better collision detection
        return this.isRectVisible(
            cx - radius,
            cy - radius,
            radius * 2,
            radius * 2,
        );
    }
}
