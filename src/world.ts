import { CELL_SIZE } from './const';
import { Context } from './context';
import { EnemyTank, PlayerTank, Tank } from './entity';
import { Block } from './entity/block';
import { Entity } from './entity/core';
import { createStaticSprite } from './entity/sprite';
import { Rect, randomInt } from './math';
import { Duration } from './math/duration';
import { Vector2, Vector2Like } from './math/vector';

export class World {
    tanks: Tank[] = [];
    player: PlayerTank;
    blocks: Block[] = [];
    isInfinite = false;
    showBoundary = false;

    constructor(public readonly screen: Rect) {
        this.player = new PlayerTank(this.screen, this);
    }

    readonly offset = Vector2.zero();

    get entities(): Entity[] {
        const entities: Entity[] = [];
        for (const t of this.tanks) {
            entities.push(t, ...t.projectiles);
        }
        return entities.concat(this.blocks);
    }

    init(infinite: boolean): void {
        this.isInfinite = infinite;
        this.generateBlocks();
        this.player.respawn();
        this.tanks = [this.player];
        this.spawnEnemy();
        this.spawnEnemy();
    }

    draw(ctx: Context): void {
        for (const b of this.blocks) {
            b.draw(ctx);
        }
        for (const t of this.tanks) {
            t.draw(ctx);
        }
    }

    update(dt: Duration): void {
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
            tank.showBoundary = this.showBoundary;
            tank.update(dt);
            if (tank.dead && tank.bot && tank.isExplosionFinished) {
                tank.respawn();
            }
        }
    }

    spawnEnemy(): void {
        // NOTE: push to the start because of rendering order (could be improved)
        const enemy = new EnemyTank(this.screen, this);
        enemy.respawn();
        this.tanks.unshift(enemy);
    }

    moveWorld(movement: Vector2Like): void {
        this.offset.sub(movement);
        for (const entity of this.entities) {
            if (entity instanceof PlayerTank) continue;
            entity.x -= movement.x;
            entity.y -= movement.y;
        }
    }

    private generateBlocks(): void {
        this.blocks = [];
        // NOTE: no blocks in inifinite mode for now.
        if (this.isInfinite) return;
        const BLOCKS_COUNT = 9;
        for (let i = 0; i < BLOCKS_COUNT; i++) {
            const x =
                this.screen.x +
                randomInt(1, this.screen.width / CELL_SIZE - 1) * CELL_SIZE;
            const y =
                this.screen.y +
                randomInt(1, this.screen.height / CELL_SIZE - 1) * CELL_SIZE;
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
