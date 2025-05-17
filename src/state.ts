import {
    RECORDING_VERSION,
    resetRecording,
    type RecordingInfo,
    type RecordingStatus,
} from '#/recording';
import {random} from '#/math/rng';

export enum GameStatus {
    INITIAL,
    PLAYING,
    PAUSED,
    DEAD,
}

export class GameState {
    status = GameStatus.INITIAL;
    debugUpdateTriggered = false;
    recording: RecordingStatus = {active: false, expected: false, playing: false, inputIndex: 0};
    recordingInfo: RecordingInfo = {
        version: RECORDING_VERSION,
        seed: 'default',
        inputs: [],
        startedAt: 0,
    };

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
        if (!this.recording.playing) {
            resetRecording(this);
            if (this.recording.expected) {
                this.recording.active = true;
                this.recording.expected = false;
                this.recordingInfo.seed = random.seed;
                this.recordingInfo.startedAt = Date.now();
            }
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
