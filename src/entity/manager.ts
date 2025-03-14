import {Camera} from '#/camera';
import {CELL_SIZE} from '#/const';
import {Block, generateBlocks} from '#/entity/block';
import {Direction, Entity, isIntesecting} from '#/entity/core';
import {ExplosionEffect} from '#/entity/effect';
import {EntityId} from '#/entity/id';
import {Projectile} from '#/entity/projectile';
import {EnemyTank, PlayerTank, Tank} from '#/entity/tank';
import {Environment} from '#/environment';
import {Duration} from '#/math/duration';
import {Vector2Like} from '#/math/vector';
import {Renderer} from '#/renderer';

export function isSameEntity(a: Entity, b: Entity): boolean {
    return a.id === b.id;
}

interface InitEntitiesOpts {
    infiniteWorld: boolean;
}

export class EntityManager {
    readonly player = new PlayerTank(this);
    readonly env = new Environment();
    tanks: Tank[] = [];
    blocks: Block[] = [];
    projectiles: Projectile[] = [];
    effects: ExplosionEffect[] = [];
    cachedBotExplosion: ExplosionEffect | null = null;
    cachedPlayerExplosion: ExplosionEffect | null = null;

    init({infiniteWorld}: InitEntitiesOpts): void {
        this.reset();
        this.env.isInfinite = infiniteWorld;
        this.blocks = generateBlocks(this);
        this.player.respawn();
        this.spawnEnemy();
        this.spawnEnemy();
        // this.spawnEnemy();
        // this.spawnEnemy();
    }

    // TODO: Entity manager should not be responsible for drawing
    drawAllEntities(renderer: Renderer): void {
        this.env.drawGrid(renderer, CELL_SIZE);
        this.env.drawWorldBoundary(renderer);
        for (const block of this.blocks) {
            block.draw(renderer);
        }
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
        for (const b of this.blocks) {
            yield b;
        }
    }

    *iterateEntities(): Generator<Entity> {
        for (const t of this.tanks) {
            yield t;
        }
        for (const p of this.projectiles) {
            yield p;
        }
        for (const b of this.blocks) {
            yield b;
        }
    }

    findTank(id: EntityId): Tank | undefined {
        return this.tanks.find((t) => t.id === id);
    }

    updateEffects(dt: Duration): void {
        for (const effect of this.effects) {
            effect.update(dt);
        }
    }

    updateAllEntities(dt: Duration, camera: Camera): void {
        this.updateTanks(dt);
        this.updateProjectiles(dt, camera);
    }

    spawnEnemy(): EnemyTank {
        // NOTE: Enemy will be dead initially, but it will be respawned automatically with the delay
        const enemy = new EnemyTank(this);
        enemy.respawnDelay.mul(0.5); // Respawn faster initially
        this.tanks.push(enemy);
        return enemy;
    }

    spawnProjectile(
        ownerId: EntityId,
        origin: Vector2Like,
        direction: Direction,
    ): void {
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
        assert(
            tank,
            `Tank with id ${sourceId} not found for explostion effect`,
        );
        const cachedEffect = tank.bot
            ? this.cachedBotExplosion
            : this.cachedPlayerExplosion;
        assert(
            cachedEffect,
            `Cached explosion effect not found, bot=${tank.bot}`,
        );
        const effect = cachedEffect.clone(tank);
        this.effects.push(effect);
    }

    private updateTanks(dt: Duration): void {
        const enemiesCount = this.tanks.length - 1;
        // NOTE: add more enemies as score increases in such progression 1=2; 2=3; 4=4; 8=5; 16=6; ...
        // TODO: find a reasonable number/function to scale entities
        const dscore = 2 ** enemiesCount;
        const shouldSpawn =
            (this.env.isInfinite
                ? this.player.score * 20
                : this.player.score) >= dscore;
        if (enemiesCount && shouldSpawn) {
            this.spawnEnemy();
        }
        for (const tank of this.tanks) {
            tank.update(dt);
            if (tank.dead && tank.bot) {
                tank.respawn();
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
        this.projectiles = this.projectiles.filter(
            (_, i) => !garbageIndexes.includes(i),
        );
    }

    private cacheExplosions(renderer: Renderer): void {
        if (!this.cachedBotExplosion) {
            const t = this.tanks.find((t) => t.bot && !t.dead && !t.hasShield);
            if (t) {
                const imageData = renderer.getImageData(
                    t.x,
                    t.y,
                    t.width,
                    t.height,
                );
                this.cachedBotExplosion = ExplosionEffect.fromImageData(
                    imageData,
                    t,
                );
            }
        }
        if (
            !this.cachedPlayerExplosion &&
            !this.player.dead &&
            !this.player.hasShield
        ) {
            const imageData = renderer.getImageData(
                this.player.x,
                this.player.y,
                this.player.width,
                this.player.height,
            );
            this.cachedPlayerExplosion = ExplosionEffect.fromImageData(
                imageData,
                this.player,
            );
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
        this.blocks = [];
        this.projectiles = [];
        this.effects = [];
    }
}
