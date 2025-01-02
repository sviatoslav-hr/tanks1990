import {World} from '#/world';

export enum GameStatus {
    INITIAL,
    PLAYING,
    PAUSED,
}

// TODO: Game/GameState should be the highest level
// Also it should have a reference to Menu, but Menu shouldn't have the Game ref
export class Game {
    status = GameStatus.INITIAL;
    debugUpdateTriggered = false;

    constructor(readonly world: World) {}

    get playing(): boolean {
        return this.status === GameStatus.PLAYING;
    }

    get paused(): boolean {
        return this.status === GameStatus.PAUSED;
    }

    get dead(): boolean {
        return this.playing && this.world.player.dead;
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

    start(infinite: boolean): void {
        this.world.init(infinite);
        this.status = GameStatus.PLAYING;
    }

    tick() {
        this.debugUpdateTriggered = false;
    }

    togglePauseResume(): void {
        switch (this.status) {
            case GameStatus.PLAYING: {
                if (this.dead) {
                    this.init();
                } else {
                    this.pause();
                }
                break;
            }
            case GameStatus.PAUSED: {
                this.resume();
                break;
            }
            case GameStatus.INITIAL:
                break;
            default:
                console.warn('Unhandled value ', this.status);
        }
    }
}
