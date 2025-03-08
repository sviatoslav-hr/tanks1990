import {Entity, isIntesecting} from '#/entity/core';
import {Rect, fmod, isPosInsideRect} from '#/math';
import {Vector2Like} from '#/math/vector';
import {Renderer} from '#/renderer';
import {Color} from '#/color';
import {EntityManager, isSameEntity} from '#/entity/manager';
import {JSONObjectParser} from '#/json';
import {BASE_HEIGHT, BASE_WIDTH} from './const';
import {GameStorage} from './storage';

const ENV_CONFIG_KEY = 'env_config';

export class Environment {
    isInfinite = false;
    gravityCoef = 20;
    frictionCoef = 8;
    showBoundary = false;
    readonly boundary: Rect = {
        x: -BASE_WIDTH / 2,
        y: -BASE_HEIGHT / 2,
        width: BASE_WIDTH,
        height: BASE_HEIGHT,
    };
    #valuesDirty = false; // NOTE: Used to mark for saving

    get needsSaving(): boolean {
        return this.#valuesDirty;
    }

    drawGrid(renderer: Renderer, cellSize: number): void {
        const camera = renderer.camera;
        cellSize *= camera.scale;
        // NOTE: Find top-left position of the camera in camera coordinates
        const cameraX0 =
            camera.worldOffset.x * camera.scale - camera.screenSize.width / 2;
        const cameraY0 =
            camera.worldOffset.y * camera.scale - camera.screenSize.height / 2;
        // NOTE: Find first visible line on the screen for each axis
        const x0 = cellSize - fmod(cameraX0, cellSize);
        const y0 = cellSize - fmod(cameraY0, cellSize);

        renderer.setStrokeColor(Color.BLACK_IERIE);
        renderer.useCameraCoords(true);
        const offset = 1;
        const maxX = x0 + camera.screenSize.width + cellSize;
        for (let colX = x0; colX < maxX; colX += cellSize) {
            const x1 = colX + offset;
            const y1 = offset - cellSize;
            const x2 = x1;
            const y2 = camera.screenSize.height + offset + cellSize;
            renderer.strokeLine(x1, y1, x2, y2);
        }
        const maxY = y0 + camera.screenSize.height + cellSize;
        for (let colY = y0; colY < maxY; colY += cellSize) {
            const x1 = offset - cellSize;
            const x2 = camera.screenSize.width + offset + cellSize;
            const y1 = colY + offset;
            const y2 = y1;
            renderer.strokeLine(x1, y1, x2, y2);
        }
        renderer.useCameraCoords(false);
    }

    drawWorldBoundary(renderer: Renderer): void {
        renderer.setStrokeColor(Color.BLACK);
        // FIXME: Why does this not scale properly?
        const boundaryThickness = 10;
        renderer.strokeBoundary(
            {
                x: this.boundary.x - boundaryThickness / 2,
                y: this.boundary.y - boundaryThickness / 2,
                width: this.boundary.width + boundaryThickness,
                height: this.boundary.height + boundaryThickness,
            },
            boundaryThickness,
        );
        if (this.showBoundary && !this.isInfinite) {
            renderer.setStrokeColor(Color.RED);
            renderer.strokeBoundary({
                x: this.boundary.x,
                y: this.boundary.y,
                width: this.boundary.width,
                height: this.boundary.height,
            });
        }
    }

    markDirty(): void {
        this.#valuesDirty = true;
    }

    save(storage: GameStorage): void {
        assert(this.#valuesDirty);
        storage.set(ENV_CONFIG_KEY, this.serialize());
        this.#valuesDirty = false;
    }

    serialize(): string {
        return JSON.stringify({
            g: this.gravityCoef,
            f: this.frictionCoef,
            b: this.showBoundary,
            inf: this.isInfinite,
            bx: this.boundary.x,
            by: this.boundary.y,
            bw: this.boundary.width,
            bh: this.boundary.height,
        });
    }

    load(storage: GameStorage): void {
        const data = storage.get(ENV_CONFIG_KEY);
        if (data) {
            this.deserialize(data);
            this.#valuesDirty = false;
        }
    }

    deserialize(data: string): void {
        const parser = new JSONObjectParser(data);
        this.gravityCoef = parser.getNumber('g') ?? 20;
        this.frictionCoef = parser.getNumber('f') ?? 8;
        this.showBoundary = parser.getBoolean('b') ?? false;
        this.isInfinite = parser.getBoolean('inf') ?? false;
        const bx = parser.getNumber('bx');
        const by = parser.getNumber('by');
        const bw = parser.getNumber('bw');
        const bh = parser.getNumber('bh');
        if (bh != null && bw != null && bx != null && by != null) {
            this.boundary.x = bx;
            this.boundary.y = by;
            this.boundary.width = bw;
            this.boundary.height = bh;
        }
    }
}

export function isOccupied(
    pos: Vector2Like,
    world: Environment,
    entityManager: EntityManager,
): boolean {
    if (!world.isInfinite) {
        if (!isPosInsideRect(pos.x, pos.y, world.boundary)) {
            return true;
        }
    }
    for (const entity of entityManager.iterateEntities()) {
        if (entity === entityManager.player) continue;
        if (isPosInsideRect(pos.x, pos.y, entity)) {
            return true;
        }
    }
    return false;
}

export function isRectOccupied(
    rect: Rect,
    entityManager: EntityManager,
    ignoreEntity?: Entity,
): boolean {
    const env = entityManager.env;
    if (!env.isInfinite) {
        if (!isPosInsideRect(rect.x, rect.y, env.boundary)) {
            return true;
        }
        const xn = rect.x + rect.width;
        const yn = rect.y + rect.height;
        if (!isPosInsideRect(xn, yn, env.boundary)) {
            return true;
        }
    }

    for (const entity of entityManager.iterateCollidable()) {
        if (isSameEntity(entity, entityManager.player)) continue;
        if (ignoreEntity && isSameEntity(entity, ignoreEntity)) continue;
        if (isIntesecting(rect, entity)) {
            return true;
        }
    }
    return false;
}
