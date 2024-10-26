import { Rect } from './math';
import { FPSCounter } from './ui';
import { World } from './world';

export enum GameStatus {
    INITIAL,
    PLAYING,
    PAUSED,
}

// TODO: Game/GameState should be the highest level
// Also it should have a reference to Menu, but Menu shouldn't have the Game ref
export class Game {
    status = GameStatus.INITIAL;
    showFps = false;
    readonly fps = new FPSCounter();
    readonly world: World;

    constructor(
        public screen: Rect,
        world: World,
    ) {
        // TODO: maybe give tanks just ref to a Game instead?
        // WARN: should the player be aware of the screen?
        this.world = world;
    }

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
}
