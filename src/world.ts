import {Camera} from '#/camera';
import {CELL_SIZE} from '#/const';
import {Context} from '#/context';
import {EnemyTank, PlayerTank, Tank} from '#/entity';
import {Block} from '#/entity/block';
import {Entity, isIntesecting} from '#/entity/core';
import {Projectile} from '#/entity/projectile';
import {createStaticSprite} from '#/entity/sprite';
import {GameInput} from '#/game-input';
import {Rect, isPosInsideRect, randomInt} from '#/math';
import {Duration} from '#/math/duration';
import {Vector2Like} from '#/math/vector';
import {GameStorage} from '#/storage';

const SHOW_BOUNDARIES_KEY = 'show_boundaries';

export class World {
    tanks: Tank[] = [];
    player: PlayerTank;
    blocks: Block[] = [];
    projectiles: Projectile[] = [];
    isInfinite = false;
    gravityCoef = 20;
    frictionCoef = 8;
    private _showBoundary = false;

    get showBoundary(): boolean {
        return this._showBoundary;
    }

    set showBoundary(value: boolean) {
        this._showBoundary = value;
        this.cache.set(SHOW_BOUNDARIES_KEY, value);
    }

    constructor(
        public readonly boundary: Rect,
        private readonly cache: GameStorage,
        input: GameInput,
    ) {
        this.player = new PlayerTank(this, input);
        this.showBoundary = cache.getBool(SHOW_BOUNDARIES_KEY) ?? false;
    }

    init(infinite: boolean): void {
        this.isInfinite = infinite;
        this.generateBlocks();
        this.player.respawn();
        this.tanks = [this.player];
        this.spawnEnemy();
        this.spawnEnemy();
    }

    draw(ctx: Context, camera: Camera): void {
        for (const b of this.blocks) {
            b.draw(ctx, camera);
        }
        for (const t of this.tanks) {
            t.draw(ctx, camera);
        }
        for (const projectile of this.projectiles) {
            if (!projectile.dead) {
                projectile.draw(ctx, camera);
            }
        }
    }

    update(dt: Duration, camera: Camera): void {
        this.updateTanks(dt, camera);
        this.updateProjectiles(dt, camera);
    }

    private updateTanks(dt: Duration, camera: Camera): void {
        const enemiesCount = this.tanks.length - 1;
        // NOTE: add more enemies as score increases in such progression 1=2; 2=3; 4=4; 8=5; 16=6; ...
        // TODO: find a reasonable number/function to scale entities
        const dscore = 2 ** enemiesCount;
        const shouldSpawn =
            (this.isInfinite ? this.player.score * 20 : this.player.score) >=
            dscore;
        if (enemiesCount && shouldSpawn) {
            this.spawnEnemy();
        }
        for (const tank of this.tanks) {
            tank.update(dt, camera);
            if (tank.dead && tank.bot && tank.isExplosionFinished) {
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

    spawnEnemy(): void {
        // NOTE: push to the start because of rendering order (could be improved)
        const enemy = new EnemyTank(this);
        enemy.respawn();
        this.tanks.unshift(enemy);
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

    isOccupied(pos: Vector2Like): boolean {
        if (!this.isInfinite) {
            if (!isPosInsideRect(pos.x, pos.y, this.boundary)) {
                return true;
            }
        }
        for (const entity of this.iterateEntities()) {
            if (entity === this.player) continue;
            if (isPosInsideRect(pos.x, pos.y, entity)) {
                return true;
            }
        }
        return false;
    }

    isRectOccupied(rect: Rect, ignoreEntity?: Rect): boolean {
        if (!this.isInfinite) {
            if (!isPosInsideRect(rect.x, rect.y, this.boundary)) {
                return true;
            }
            if (
                !isPosInsideRect(
                    rect.x + rect.width,
                    rect.y + rect.height,
                    this.boundary,
                )
            ) {
                return true;
            }
        }
        for (const entity of this.iterateEntities()) {
            if (entity === this.player) continue;
            if (ignoreEntity && entity === ignoreEntity) continue;
            if (isIntesecting(rect, entity)) {
                return true;
            }
        }
        return false;
    }

    private generateBlocks(): void {
        this.blocks = [];
        // NOTE: no blocks in inifinite mode for now.
        if (this.isInfinite) return;
        const BLOCKS_COUNT = 9;
        for (let i = 0; i < BLOCKS_COUNT; i++) {
            const x =
                this.boundary.x +
                randomInt(1, this.boundary.width / CELL_SIZE - 1) * CELL_SIZE;
            const y =
                this.boundary.y +
                randomInt(1, this.boundary.height / CELL_SIZE - 1) * CELL_SIZE;
            const sprite = createStaticSprite({
                key: 'bricks',
                frameWidth: 64,
                frameHeight: 64,
            });
            const block = new Block({
                x,
                y,
                width: CELL_SIZE,
                height: CELL_SIZE,
                texture: sprite,
            });
            this.blocks.push(block);
        }
    }
}
