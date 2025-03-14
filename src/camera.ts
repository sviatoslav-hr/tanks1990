import {Vector2} from '#/math/vector';
import {Rect} from '#/math';

// TODO: Have 2 Cameras: dev and player

export class Camera {
    // NOTE: Offset of the center of the camera from the center of the world
    readonly worldOffset: Vector2 = Vector2.zero();
    // NOTE: Size of the screen in pixels
    readonly screenSize: Vector2;
    // NOTE: This is affected by the scaling settings of the OS.
    readonly pixelRatio: number = window.devicePixelRatio;
    readonly focusPaddingInPixels = 32;
    visibleScale = 1;
    lastAutoScale = 1;
    manualMode = false;

    constructor(screenWidth: number, screenHeight: number) {
        assert(screenWidth > 0 && screenHeight > 0, 'Invalid camera size');
        this.screenSize = new Vector2(screenWidth, screenHeight);
    }

    get x0(): number {
        return this.worldOffset.x - this.screenSize.width / 2 / this.visibleScale;
    }

    get y0(): number {
        return this.worldOffset.y - this.screenSize.height / 2 / this.visibleScale;
    }

    get scale() {
        return this.visibleScale;
    }

    getSizeRect(): Rect {
        return {
            x: 0,
            y: 0,
            width: this.screenSize.x,
            height: this.screenSize.y,
        };
    }

    centerOn(entity: Rect): void {
        const entityCenterX = entity.x + entity.width / 2;
        const entityCenterY = entity.y + entity.height / 2;
        this.worldOffset.set(entityCenterX, entityCenterY);
    }

    setScale(scale: number): void {
        assert(!isNaN(scale) && scale > 0 && Number.isFinite(scale));
        this.visibleScale = scale;
        if (!this.manualMode) {
            this.lastAutoScale = this.visibleScale;
        }
    }

    focusOnRect(rect: Rect, padding = this.focusPaddingInPixels): void {
        const rectScale = 1;
        const scaleX = (this.screenSize.width - padding * 2) / (rect.width * rectScale);
        const scaleY = (this.screenSize.height - padding * 2) / (rect.height * rectScale);
        this.setScale(Math.min(scaleX, scaleY));
        this.centerOn(rect);
    }

    reset(): void {
        this.worldOffset.set(0, 0);
        this.visibleScale = this.lastAutoScale;
        this.manualMode = false;
    }

    isRectVisible(x: number, y: number, width: number, height: number): boolean;
    isRectVisible(rect: Rect): boolean;
    isRectVisible(rectOrX: Rect | number, y?: number, width?: number, height?: number): boolean {
        if (typeof rectOrX === 'number') {
            assert(y != null && width != null && height != null, 'Invalid arguments');
            return (
                rectOrX + width > this.x0 &&
                rectOrX < this.x0 + this.screenSize.x &&
                y + height > this.y0 &&
                y < this.y0 + this.screenSize.y
            );
        }
        return (
            rectOrX.x + rectOrX.width > this.x0 &&
            rectOrX.x < this.x0 + this.screenSize.x &&
            rectOrX.y + rectOrX.height > this.y0 &&
            rectOrX.y < this.y0 + this.screenSize.y
        );
    }

    isLineVisible(x1: number, y1: number, x2: number, y2: number, lineWidth: number): boolean {
        return this.isRectVisible(
            Math.min(x1, x2) - lineWidth,
            Math.min(y1, y2) - lineWidth,
            Math.abs(x2 - x1) + lineWidth * 2,
            Math.abs(y2 - y1) + lineWidth * 2,
        );
    }

    isCircleVisible(cx: number, cy: number, radius: number): boolean {
        // TODO: Add better visibility check (corner cases)
        return this.isRectVisible(cx - radius, cy - radius, radius * 2, radius * 2);
    }

    toWorldX(screenX: number): number {
        // (wx - woy)*s + sw/2 = sx`  =>  `wx = (sx - sw/2)/s + woy`
        return (screenX - this.screenSize.width / 2) / this.scale + this.worldOffset.x;
    }

    toWorldY(screenY: number): number {
        return (screenY - this.screenSize.height / 2) / this.scale + this.worldOffset.y;
    }

    toWorldSize(screenSize: number): number {
        return screenSize / this.scale;
    }
}
