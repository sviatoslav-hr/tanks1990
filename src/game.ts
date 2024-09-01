import { CELL_SIZE } from './const';
import { Context } from './context';
import { EnemyTank, PlayerTank, Tank } from './entity';
import { Block } from './entity/block';
import { Entity } from './entity/core';
import { createStaticSprite } from './entity/sprite';
import { Rect, Vec2, randomInt } from './math';

export enum GameStatus {
    INITIAL,
    PLAYING,
    PAUSED,
}

// TODO: Game/GameState should be the highest level
// Also it should have a reference to Menu, but Menu shouldn't have the Game ref
export class Game {
    tanks: Tank[] = [];
    blocks: Block[] = [];
    player: PlayerTank;
    status = GameStatus.INITIAL;
    showFps = false;
    showBoundaries = false;
    readonly worldOffset: Vec2 = { x: 0, y: 0 };
    private infiniteMode = false;

    constructor(public screen: Rect) {
        // TODO: maybe give tanks just ref to a Game instead?
        // WARN: should the player be aware of the screen?
        this.player = new PlayerTank(this.screen, this);
    }

    get infinite(): boolean {
        return this.infiniteMode;
    }

    get playing(): boolean {
        return this.status === GameStatus.PLAYING;
    }

    get paused(): boolean {
        return this.status === GameStatus.PAUSED;
    }

    get dead(): boolean {
        return this.playing && this.player.dead;
    }

    get entities(): Entity[] {
        const entities: Entity[] = [];
        for (const t of this.tanks) {
            entities.push(t, ...t.projectiles);
        }
        return entities.concat(this.blocks);
    }

    init(): void {
        this.status = GameStatus.INITIAL;
    }

    private spawnEnemy(): void {
        // NOTE: push to the start because of rendering order (could be improved)
        this.tanks.unshift(new EnemyTank(this.screen, this));
    }

    pause(): void {
        this.status = GameStatus.PAUSED;
    }

    resume(): void {
        this.status = GameStatus.PLAYING;
    }

    start(infinite = false): void {
        this.infiniteMode = infinite;
        this.loadLevel();
        this.player.respawn();
        this.status = GameStatus.PLAYING;
        this.tanks = [this.player];
        this.spawnEnemy();
        this.spawnEnemy();
    }

    drawTanks(ctx: Context): void {
        for (const b of this.blocks) {
            b.draw(ctx);
        }
        for (const t of this.tanks) {
            t.draw(ctx);
        }
    }

    updateTanks(dt: number, showBoundary: boolean): void {
        if (!this.playing) {
            return;
        }
        const enemiesCount = this.tanks.length - 1;
        // NOTE: add more enemies as score inscreases in such progression 1=2; 2=3; 4=4; 8=5; 16=6; ...
        // TODO: find a reasonable number/function to scale enetities
        const dscore = 2 ** enemiesCount;
        const shouldSpawn =
            (this.infiniteMode ? this.player.score * 20 : this.player.score) >=
            dscore;
        if (enemiesCount && shouldSpawn) {
            this.spawnEnemy();
        }
        for (const tank of this.tanks) {
            tank.showBoundary = showBoundary;
            tank.update(dt);
            if (tank.dead && tank.bot) {
                tank.respawn();
            }
        }
    }

    moveWorld(movement: Vec2): void {
        this.worldOffset.x -= movement.x;
        this.worldOffset.y -= movement.y;
        for (const entity of this.entities) {
            if (entity instanceof PlayerTank) continue;
            entity.x -= movement.x;
            entity.y -= movement.y;
        }
    }

    private loadLevel(): void {
        this.blocks = [];
        // NOTE: no blocks in inifinite mode for now.
        if (this.infiniteMode) return;
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
