import {Camera} from '#/camera';
import {Direction, Entity, isIntesecting} from '#/entity/core';
import {ExplosionEffect} from '#/entity/effect';
import {EntityId} from '#/entity/id';
import {Projectile} from '#/entity/projectile';
import {EnemyTank, PlayerTank, Tank} from '#/entity/tank';
import {Room, World} from '#/world';
import {Duration} from '#/math/duration';
import {Vector2Like} from '#/math/vector';
import {Renderer} from '#/renderer';

export function isSameEntity(a: Entity, b: Entity): boolean {
    return a.id === b.id;
}

export class EntityManager {
    readonly world = new World();
    readonly player = new PlayerTank(this);
    tanks: Tank[] = [];
    projectiles: Projectile[] = [];
    effects: ExplosionEffect[] = [];
    cachedBotExplosion: ExplosionEffect | null = null;
    cachedPlayerExplosion: ExplosionEffect | null = null;
    private roomInFocus = false;

    init(): void {
        this.reset();
        this.player.respawn();
        this.world.init(this);
        this.roomInFocus = false;
    }

    // TODO: Entity manager should not be responsible for drawing
    drawAll(renderer: Renderer): void {
        if (!this.roomInFocus) {
            renderer.camera.focusOnRect(this.world.activeRoom.boundary);
            this.roomInFocus = true;
        }
        this.world.draw(renderer);
        for (const effect of this.effects) {
            effect.draw(renderer);
        }
        for (const tank of this.tanks) {
            if (tank.bot) {
                tank.draw(renderer);
            }
        }
        // NOTE: player should be drawn last to be on top of the entities
        this.player.draw(renderer);
        this.cacheExplosions(renderer);
        for (const projectile of this.projectiles) {
            projectile.draw(renderer);
        }
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
        const effectsToRemove: ExplosionEffect[] = [];
        for (const effect of this.effects) {
            effect.update(dt);
            if (effect.animation.finished) {
                effectsToRemove.push(effect);
            }
        }
        this.effects = this.effects.filter((e) => !effectsToRemove.includes(e));
    }

    updateAll(dt: Duration, camera: Camera): void {
        this.world.update(this);
        if (this.world.activeRoom.shouldActivateNextRoom(this.player)) {
            const nextRoom = this.world.activeRoom.nextRoom;
            assert(nextRoom);
            this.world.activeRoom = nextRoom;
            this.roomInFocus = false;
        }
        {
            const room = this.world.activeRoom;
            while (room.expectedEnemiesCount > 0) {
                this.spawnEnemy(room);
            }
        }
        this.updateTanks(dt);
        this.updateProjectiles(dt, camera);
    }

    spawnProjectile(ownerId: EntityId, origin: Vector2Like, direction: Direction): void {
        const deadProjectile = this.projectiles.find((p) => p.dead);
        if (deadProjectile) {
            // NOTE: reuse dead projectiles instead of creating new ones
            deadProjectile.reviveAt(ownerId, origin.x, origin.y, direction);
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
        // TODO: measure if dead projectiles should be cleaned up at some point
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

    spawnEnemy(room: Room): EnemyTank {
        const deadEnemy = this.tanks.find((t) => t.bot && t.dead && !t.shouldRespawn) as EnemyTank;
        // NOTE: Enemy will be dead initially, but it will be respawned automatically with the delay
        const enemy = deadEnemy ?? new EnemyTank(this);
        assert(enemy.dead);
        if (!deadEnemy) {
            console.log('[Manager] Created new enemy tank', enemy.id);
            this.tanks.push(enemy);
        } else {
            console.log('[Manager] Reused dead enemy tank', enemy.id);
        }
        enemy.room = room;
        enemy.markForRespawn();
        enemy.room.pendingEnemiesCount++;
        enemy.room.expectedEnemiesCount--;
        return enemy;
    }

    private updateTanks(dt: Duration): void {
        for (const tank of this.tanks) {
            tank.update(dt);

            if (tank.bot && tank.shouldRespawn) {
                const canRespawn = tank.room.aliveEnemiesCount < tank.room.enemyLimitAtOnce;
                if (canRespawn) {
                    // TODO: For some reason it takes way too much attempts to respawn...
                    // Need to have a deeper look into this.
                    const respawned = tank.respawn();
                    if (respawned) {
                        assert(!tank.dead);
                        tank.room.aliveEnemiesCount++;
                        tank.room.pendingEnemiesCount--;
                    }
                } else {
                    assert(tank instanceof EnemyTank);
                    tank.markForRespawn();
                }
            }
        }
    }

    private updateProjectiles(dt: Duration, camera: Camera): void {
        const garbageIndexes: number[] = [];
        for (const [index, projectile] of this.projectiles.entries()) {
            if (projectile.dead) {
                garbageIndexes.push(index);
            } else {
                projectile.update(dt, camera);
            }
        }
        // TODO: optimize this. Is it more efficient to update existing array or create a new one?
        this.projectiles = this.projectiles.filter((_, i) => !garbageIndexes.includes(i));
    }

    private cacheExplosions(renderer: Renderer): void {
        if (!this.cachedBotExplosion) {
            const t = this.tanks.find((t) => t.bot && !t.dead && !t.hasShield);
            if (t) {
                const imageData = renderer.getImageData(t.x, t.y, t.width, t.height);
                this.cachedBotExplosion = ExplosionEffect.fromImageData(imageData, t);
            }
        }
        if (!this.cachedPlayerExplosion && !this.player.dead && !this.player.hasShield) {
            const imageData = renderer.getImageData(
                this.player.x,
                this.player.y,
                this.player.width,
                this.player.height,
            );
            this.cachedPlayerExplosion = ExplosionEffect.fromImageData(imageData, this.player);
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
