import {Vector2} from '#/math/vector';
import {Rect} from '#/math';

export class Camera {
    readonly position: Vector2 = Vector2.zero();

    constructor(public readonly size: Vector2) {
        assert(size.x > 0 && size.y > 0, 'Invalid camera size');
    }

    get sizeRect(): Rect {
        return {x: 0, y: 0, width: this.size.x, height: this.size.y};
    }

    centerOn(entity: Rect): void {
        const x = entity.x + entity.width / 2;
        const y = entity.y + entity.height / 2;
        this.position.set(x - this.size.x / 2, y - this.size.y / 2);
    }

    isEntityVisible(entity: Rect): boolean {
        return (
            entity.x + entity.width > this.position.x &&
            entity.x < this.position.x + this.size.x &&
            entity.y + entity.height > this.position.y &&
            entity.y < this.position.y + this.size.y
        );
    }
}
