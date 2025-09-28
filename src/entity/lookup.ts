import {isIntesecting, isSameEntity, type Entity} from '#/entity/core';
import {type GameState} from '#/state';
import {type EntityId} from '#/entity/id';
import {Tank} from '#/entity/tank';
import {Vector2Like} from '#/math/vector';
import {isPosInsideRect, Rect} from '#/math';

export function* iterateEntities(state: GameState): Generator<Entity> {
    for (const t of state.tanks) {
        if (!t.dead) {
            yield t;
        }
    }
    for (const p of state.projectiles) {
        if (!p.dead) {
            yield p;
        }
    }
    for (const b of state.world.activeRoom.blocks) {
        if (!b.dead) {
            yield b;
        }
    }
}

export function* iterateCollidable(state: GameState): Generator<Entity> {
    for (const t of state.tanks) {
        if (!t.dead) yield t;
    }
    for (const b of state.world.activeRoom.blocks) {
        if (!b.dead) yield b;
    }
}

export function findTank(state: GameState, id: EntityId): Tank | undefined {
    return state.tanks.find((t) => t.id === id);
}

export function findCollided(state: GameState, target: Entity): Entity | undefined {
    for (const entity of iterateCollidable(state)) {
        if (entity.equals(target)) continue;
        if (isIntesecting(target, entity)) {
            return entity;
        }
    }
    return;
}

export function isOccupied(pos: Vector2Like, state: GameState, ignoredEntity?: Entity): boolean {
    for (const entity of iterateCollidable(state)) {
        if (entity === state.player) continue;
        if (ignoredEntity && isSameEntity(entity, ignoredEntity)) continue;
        if (isPosInsideRect(pos.x, pos.y, entity)) {
            return true;
        }
    }
    return false;
}

export function isRectOccupied(rect: Rect, state: GameState, ignoreEntity?: Entity): boolean {
    for (const entity of iterateCollidable(state)) {
        if (isSameEntity(entity, state.player)) continue;
        if (ignoreEntity && isSameEntity(entity, ignoreEntity)) continue;
        if (isIntesecting(rect, entity)) {
            return true;
        }
    }
    return false;
}
