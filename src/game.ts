import { Context } from "./context";
import { EnemyTank, PlayerTank, Tank } from "./entity";
import { Entity } from "./entity/core";
import { Rect } from "./math";

export enum GameStatus {
    START,
    PLAYING,
    PAUSED,
    DEAD,
}

export class Game {
    tanks: Tank[] = [];
    player: PlayerTank;
    status = GameStatus.START;

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

    drawTanks(ctx: Context): void {
        for (const t of this.tanks) {
            t.draw(ctx);
        }
    }

    updateTanks(dt: number, showBoundary: boolean): void {
        if (![GameStatus.PLAYING, GameStatus.DEAD].includes(this.status)) {
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

    updateStatusByMenu(): void {
        switch (this.status) {
            case GameStatus.PAUSED:
                this.status = GameStatus.PLAYING;
                break;
            case GameStatus.PLAYING:
                this.status = GameStatus.PAUSED;
                break;
            case GameStatus.START:
            case GameStatus.DEAD: {
                this.player.respawn();
                this.status = GameStatus.PLAYING;
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
