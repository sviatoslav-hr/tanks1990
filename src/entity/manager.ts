import {Boom, ParticleExplosion} from '#/effect';
import {Entity, isIntesecting, isSameEntity} from '#/entity/core';
import {EntityId} from '#/entity/id';
import {Projectile} from '#/entity/projectile';
import {EnemyTank, PlayerTank, Tank} from '#/entity/tank';
import {isEnemyTank} from '#/entity/tank/enemy';
import {TankPartKind} from '#/entity/tank/generation';
import {EventQueue} from '#/events';
import {isPosInsideRect, type Rect} from '#/math';
import {Direction} from '#/math/direction';
import {Duration} from '#/math/duration';
import {Vector2, Vector2Like} from '#/math/vector';
import {Camera} from '#/renderer/camera';
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

    init(): void {
        this.reset();
        this.player.respawn();
        this.world.init(this);
    }

    *iterateCollidable(): Generator<Entity> {
        for (const t of this.tanks) {
            if (!t.dead) {
                yield t;
            }
        }
        for (const b of this.world.activeRoom.blocks) {
            if (!b.dead) {
                yield b;
            }
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

    updateEffects(dt: Duration): void {
        const effectsToRemove: ParticleExplosion[] = [];
        for (const effect of this.effects) {
            effect.update(dt);
            if (effect.animation.finished) {
                effectsToRemove.push(effect);
            }
        }
        if (effectsToRemove.length) {
            this.effects = this.effects.filter((e) => !effectsToRemove.includes(e));
        }
        const boomsToRemove: Boom[] = [];
        for (const boom of this.booms) {
            boom.update(dt);
            if (boom.animation.finished) {
                boomsToRemove.push(boom);
            }
        }
        if (boomsToRemove.length) {
            this.booms = this.booms.filter((b) => !boomsToRemove.includes(b));
        }
    }

    updateAllEntities(dt: Duration, camera: Camera, events: EventQueue): void {
        this.world.update(this);
        if (this.world.activeRoom.shouldActivateNextRoom(this.player)) {
            const nextRoom = this.world.activeRoom.nextRoom;
            assert(nextRoom);
            this.world.activeRoom = nextRoom;
            this.world.activeRoomInFocus = false;
        }

        if (!this.world.activeRoomInFocus) {
            camera.focusOnRect(this.world.activeRoom.boundary);
            this.world.activeRoomInFocus = true;
        }

        {
            const wave = this.world.activeRoom.wave;
            while (wave.hasExpectedEnemies) {
                this.spawnEnemy();
            }
        }
        this.updateTanks(dt, events);
        this.updateProjectiles(dt, camera, events);
    }

    spawnProjectile(
        ownerId: EntityId,
        origin: Vector2Like,
        direction: Direction,
        damage: number,
    ): void {
        const deadProjectile = this.projectiles.find((p) => p.dead);
        if (deadProjectile) {
            // NOTE: reuse dead projectiles instead of creating new ones
            const showByPlayer = this.player.id === ownerId;
            deadProjectile.reviveAt(ownerId, origin.x, origin.y, direction, showByPlayer);
            deadProjectile.damage = damage;
            return;
        }

        const size = Projectile.SIZE;
        const projectile = new Projectile(this, {
            x: origin.x - size / 2,
            y: origin.y - size / 2,
            size,
            ownerId,
            direction,
        });
        projectile.damage = damage;
        this.projectiles.push(projectile);
    }

    spawnExplosionEffect(sourceId: EntityId): void {
        const tank = this.findTank(sourceId);
        assert(tank, `Tank with id ${sourceId} not found for explostion effect`);
        const cachedEffect = tank.bot ? this.cachedBotExplosion : this.cachedPlayerExplosion;
        assert(cachedEffect, `Cached explosion effect not found, bot=${tank.bot}`);
        const effect = cachedEffect.clone(tank);
        this.effects.push(effect);
    }

    spawnBoom(sourceId: EntityId): void {
        const projectile = this.projectiles.find((p) => p.id === sourceId);
        if (!projectile) {
            logger.warn(`Projectile with id ${sourceId} not found for boom effect`);
            return;
        }
        const position = new Vector2(projectile.x, projectile.y);
        this.booms.push(new Boom(position));
    }

    spawnEnemy(enemyKind?: TankPartKind, skipDelay = false): EnemyTank {
        const deadEnemy = this.tanks.find((t) => t.bot && t.dead && !t.shouldRespawn) as EnemyTank;
        // NOTE: Enemy will be dead initially, but it will be respawned automatically with the delay
        // to not spawn it immediately and also have the ability to not spawn everyone at once.
        const enemy = deadEnemy ?? new EnemyTank(this);
        assert(enemy.dead);
        if (!deadEnemy) {
            // NOTE: Player should be drawn last, so enemies are added to the beginning of the array.
            this.tanks.unshift(enemy);
            logger.debug('[Manager] Created new enemy tank', enemy.id);
        } else {
            logger.debug('[Manager] Reused dead enemy tank', enemy.id);
        }
        enemy.room = this.world.activeRoom;
        if (skipDelay) {
            enemy.room.wave.spawnEnemy(enemy);
        } else {
            enemy.room.wave.queueEnemy(enemy, enemyKind);
        }
        return enemy;
    }

    updateTanks(dt: Duration, events: EventQueue): void {
        const wave = this.world.activeRoom.wave;
        for (const tank of this.tanks) {
            tank.update(dt);
            if (!tank.dead && isEnemyTank(tank)) {
                const event = tank.shoot();
                if (event) events.push(event);
            }

            if (tank.bot && tank.shouldRespawn) {
                assert(tank instanceof EnemyTank);
                if (tank.respawnDelay.positive) {
                    continue;
                } else if (wave.hasRespawnPlace) {
                    // TODO: For some reason it takes way too much attempts to respawn...
                    //       Need to have a deeper look into this.
                    wave.spawnEnemy(tank);
                }
            }
        }
    }

    private updateProjectiles(dt: Duration, camera: Camera, events: EventQueue): void {
        for (const projectile of this.projectiles) {
            if (!projectile.dead) {
                projectile.update(dt, camera, events);
            }
        }
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

    private reset(): void {
        this.tanks = [this.player];
        this.world.reset();
        this.projectiles = [];
        this.effects = [];
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
