import { Context } from "./context";
import { EnemyTank, PlayerTank, Tank } from "./entity";
import { Entity } from "./entity/core";
import { Rect } from "./math";
import { Menu } from "./menu";

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
        // TODO: maybe give tanks ref to a Game instead?
        this.player = new PlayerTank(this.screen, this);
        this.tanks.push(
            new EnemyTank(this.screen, this),
            new EnemyTank(this.screen, this),
            new EnemyTank(this.screen, this),
            this.player,
        );
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

    init(): void {
        this.status = GameStatus.INITIAL;
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
        for (const tank of this.tanks) {
            tank.showBoundary = showBoundary;
            tank.update(dt);
            if (tank.dead && tank.bot) {
                tank.respawn();
            }
        }
    }

    get entities(): Entity[] {
        const entities: Entity[] = [];
        for (const t of this.tanks) {
            entities.push(t, ...t.projectiles);
        }
        return entities;
    }
}
