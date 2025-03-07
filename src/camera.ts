import {Vector2} from '#/math/vector';
import {Rect} from '#/math';

// TODO: Have 2 Cameras: dev and player

export class Camera {
    // NOTE: Offset of the center of the camera from the center of the world
    readonly offset: Vector2 = Vector2.zero();
    readonly size: Vector2;
    readonly pixelRatio: number;
    visibleScale = 1;
    lastAutoScale = 1;
    manualMode = false;

    constructor(width: number, height: number) {
        assert(width > 0 && height > 0, 'Invalid camera size');
        this.size = new Vector2(width, height);
        // NOTE: This is affected by the scaling settings of the OS.
        this.pixelRatio = window.devicePixelRatio;
    }

    get x0(): number {
        return this.offset.x - this.size.width / 2;
    }

    get y0(): number {
        return this.offset.y - this.size.height / 2;
    }

    get scale() {
        return this.visibleScale;
    }

    getSizeRect(): Rect {
        return {x: 0, y: 0, width: this.size.x, height: this.size.y};
    }

    centerOn(entity: Rect): void {
        const entityCenterX = entity.x + entity.width / 2;
        const entityCenterY = entity.y + entity.height / 2;
        this.offset
            .set(entityCenterX, entityCenterY)
            .multiplyScalar(this.scale); // TODO: Is this needed?
    }

    setScale(scale: number): void {
        assert(!isNaN(scale) && scale > 0 && Number.isFinite(scale));
        const prevScale = this.visibleScale;
        this.visibleScale = scale;
        this.offset.multiplyScalar(scale / prevScale);
        if (!this.manualMode) {
            this.lastAutoScale = this.visibleScale;
        }
    }

    focusOnRect(rect: Rect): void {
        const scaleX = this.size.width / rect.width;
        const scaleY = this.size.height / rect.height;
        // const scaleX = (rect.width / this.size.width) * 4;
        // const scaleY = (rect.height / this.size.height) * 4;
        this.setScale(Math.min(scaleX, scaleY));
        this.centerOn(rect);
    }

    reset(): void {
        this.offset.set(0, 0);
        this.visibleScale = this.lastAutoScale;
        this.manualMode = false;
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
                rectOrX + width > this.x0 &&
                rectOrX < this.x0 + this.size.x &&
                y + height > this.y0 &&
                y < this.y0 + this.size.y
            );
        }
        return (
            rectOrX.x + rectOrX.width > this.x0 &&
            rectOrX.x < this.x0 + this.size.x &&
            rectOrX.y + rectOrX.height > this.y0 &&
            rectOrX.y < this.y0 + this.size.y
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
