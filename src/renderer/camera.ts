import {Rect} from '#/math';
import {Vector2} from '#/math/vector';

export class Camera {
    /** Offset of the center of the camera from the center of the world */
    readonly worldOffset = Vector2.zero();
    /** Size of the screen in pixels */
    readonly screenSize = Vector2.zero();
    // NOTE: This is affected by the scaling settings of the OS.
    readonly pixelRatio: number = window.devicePixelRatio;
    readonly focusPaddingInPixels = 32;
    visibleScale = 1;

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
    }

    focusOnRect(rect: Rect, padding = this.focusPaddingInPixels): void {
        const rectScale = 1;
        const scaleX = (this.screenSize.width - padding * 2) / (rect.width * rectScale);
        const scaleY = (this.screenSize.height - padding * 2) / (rect.height * rectScale);
        this.setScale(Math.min(scaleX, scaleY));
        this.centerOn(rect);
    }

    isRectVisible(x: number, y: number, width: number, height: number): boolean;
    isRectVisible(rect: Rect): boolean;
    isRectVisible(rectOrX: Rect | number, y?: number, width?: number, height?: number): boolean {
        const visibleWidth = this.screenSize.width / this.scale;
        const visibleHeight = this.screenSize.height / this.scale;
        const visibleX = this.worldOffset.x - visibleWidth / 2;
        const visibleY = this.worldOffset.y - visibleHeight / 2;
        if (typeof rectOrX === 'number') {
            const x = rectOrX;
            assert(y != null && width != null && height != null, 'Invalid arguments');
            return (
                x + width >= visibleX &&
                x <= visibleX + visibleWidth &&
                y + height >= visibleY &&
                y <= visibleY + visibleHeight
            );
        }
        const rect = rectOrX;
        return this.isRectVisible(rect.x, rect.y, rect.width, rect.height);
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
