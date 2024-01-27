import { Context } from "./context";
import { EnemyTank, PlayerTank, Tank } from "./entity";
import { Entity } from "./entity/core";
import { Rect } from "./math";

export enum GameStatus {
    INITIAL,
    PLAYING,
    PAUSED,
}

export class Game {
    tanks: Tank[] = [];
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
        return entities;
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
        this.player.respawn();
        this.status = GameStatus.PLAYING;
        this.tanks = [this.player];
        this.addEnemy();
        this.addEnemy();
    }

    drawTanks(ctx: Context): void {
        for (const t of this.tanks) {
            t.draw(ctx);
        }
    }

    updateTanks(dt: number, showBoundary: boolean): void {
        if (!this.playing) {
            return;
        }
        const enemiesCount = this.tanks.length - 1;
        // NOTE: add more enemies as score inscreases in such progression 1=1; 4=2; 8=3; 16=4; 32=5; ...
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
}
