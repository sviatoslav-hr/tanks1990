import {Boom, ParticleExplosion} from '#/effect';
import {Entity, isIntesecting, isSameEntity} from '#/entity/core';
import {EntityId} from '#/entity/id';
import {Projectile} from '#/entity/projectile';
import {PlayerTank, Tank} from '#/entity/tank';
import {isPosInsideRect, type Rect} from '#/math';
import {Vector2Like} from '#/math/vector';
import {World} from '#/world/world';

export class EntityManager {
    readonly world = new World();
    readonly player = new PlayerTank(this);
    tanks: Tank[] = [];
    projectiles: Projectile[] = [];
    effects: ParticleExplosion[] = [];
    booms: Boom[] = [];
    cachedBotExplosion: ParticleExplosion | null = null;
    cachedPlayerExplosion: ParticleExplosion | null = null;

    *iterateCollidable(): Generator<Entity> {
        for (const t of this.tanks) {
            if (!t.dead) yield t;
        }
        for (const b of this.world.activeRoom.blocks) {
            if (!b.dead) yield b;
        }
    }

    *iterateEntities(): Generator<Entity> {
        for (const t of this.tanks) {
            if (!t.dead) {
                yield t;
            }
        }
        for (const p of this.projectiles) {
            if (!p.dead) {
                yield p;
            }
        }
        for (const b of this.world.activeRoom.blocks) {
            if (!b.dead) {
                yield b;
            }
        }
    }

    findTank(id: EntityId): Tank | undefined {
        return this.tanks.find((t) => t.id === id);
    }

    findCollided(target: Entity): Entity | undefined {
        for (const entity of this.iterateCollidable()) {
            if (entity.equals(target)) continue;
            if (isIntesecting(target, entity)) {
                return entity;
            }
        }
        return;
    }
}

export function isOccupied(
    pos: Vector2Like,
    manager: EntityManager,
    ignoredEntity?: Entity,
): boolean {
    for (const entity of manager.iterateCollidable()) {
        if (entity === manager.player) continue;
        if (ignoredEntity && isSameEntity(entity, ignoredEntity)) continue;
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
    for (const entity of entityManager.iterateCollidable()) {
        if (isSameEntity(entity, entityManager.player)) continue;
        if (ignoreEntity && isSameEntity(entity, ignoreEntity)) continue;
        if (isIntesecting(rect, entity)) {
            return true;
        }
    }
    return false;
}
