import { Color } from "./color";
import { CELL_SIZE } from "./const";
import { Context } from "./context";
import { EnemyTank, PlayerTank, Tank } from "./entity";
import { Block } from "./entity/block";
import { Entity } from "./entity/core";
import { Sprite, createStaticSprite } from "./entity/sprite";
import { Rect, randomInt } from "./math";

export enum GameStatus {
    INITIAL,
    PLAYING,
    PAUSED,
}

export class Game {
    tanks: Tank[] = [];
    blocks: Block[] = [];
    player: PlayerTank;
    status = GameStatus.INITIAL;

    constructor(public screen: Rect) {
        // TODO: maybe give tanks just ref to a Game instead?
        this.player = new PlayerTank(this.screen, this);
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

    addEnemy(): void {
        // NOTE: push to the start because of rendering order (could be improved)
        this.tanks.unshift(new EnemyTank(this.screen, this));
    }

    pause(): void {
        this.status = GameStatus.PAUSED;
    }

    resume(): void {
        this.status = GameStatus.PLAYING;
    }

    start(): void {
        this.loadLevel();
        this.player.respawn();
        this.status = GameStatus.PLAYING;
        this.tanks = [this.player];
        this.addEnemy();
        this.addEnemy();
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
        if (enemiesCount && this.player.score >= dscore) {
            this.addEnemy();
        }
        for (const tank of this.tanks) {
            tank.showBoundary = showBoundary;
            tank.update(dt);
            if (tank.dead && tank.bot) {
                tank.respawn();
            }
        }
    }

    private loadLevel(): void {
        this.blocks = [];
        const BLOCKS_COUNT = 9;
        for (let i = 0; i < BLOCKS_COUNT; i++) {
            const x =
                this.screen.x +
                randomInt(1, this.screen.width / CELL_SIZE - 1) * CELL_SIZE;
            const y =
                this.screen.y +
                randomInt(1, this.screen.height / CELL_SIZE - 1) * CELL_SIZE;
            const sprite = createStaticSprite({
                key: "bricks",
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
