import type {InputState} from '#/input-handler';
import {resetInputState} from '#/recording';

export enum GameStatus {
    INITIAL,
    PLAYING,
    PAUSED,
    DEAD,
}

export class GameState {
    status = GameStatus.INITIAL;
    debugUpdateTriggered = false;
    recordingExpected = false;
    isRecording = false;
    inputs: InputState[] = [];

    get initial(): boolean {
        return this.status === GameStatus.INITIAL;
    }

    get playing(): boolean {
        return this.status === GameStatus.PLAYING;
    }

    get paused(): boolean {
        return this.status === GameStatus.PAUSED;
    }

    get dead(): boolean {
        return this.status === GameStatus.DEAD;
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
        resetInputState(this);
        if (this.recordingExpected) {
            this.isRecording = true;
            this.recordingExpected = false;
        }
        this.status = GameStatus.PLAYING;
    }

    markDead(): void {
        this.status = GameStatus.DEAD;
    }

    nextTick() {
        this.debugUpdateTriggered = false;
    }

    togglePauseResume(): void {
        switch (this.status) {
            case GameStatus.PLAYING: {
                if (!this.dead) {
                    this.pause();
                }
                break;
            }
            case GameStatus.PAUSED: {
                assert(!this.dead, 'Cannot die while paused');
                this.resume();
                break;
            }
            case GameStatus.INITIAL:
                break;
            default:
                logger.warn('Unhandled Game status %s', this.status);
        }
    }
}
