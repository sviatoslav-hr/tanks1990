import {
    RECORDING_VERSION,
    resetRecording,
    toggleRecording,
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
    recording: RecordingStatus = {
        enabled: true,
        active: false,
        playing: false,
        inputIndex: 0,
    };
    recordingInfo: RecordingInfo = {
        commitHash: COMMIT_HASH,
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
            if (this.recording.enabled) {
                this.recording.active = true;
                this.recordingInfo.seed = random.seed;
                this.recordingInfo.startedAt = Date.now();
            }
        }
        this.status = GameStatus.PLAYING;
    }

    markDead(): void {
        if (this.recording.active) {
            toggleRecording(this);
        }
        if (this.recording.playing) {
            this.recording.playing = false;
        }
        this.status = GameStatus.DEAD;
    }

    nextTick() {
        this.debugUpdateTriggered = false;
    }

    togglePauseResume(): void {
        switch (this.status) {
            case GameStatus.DEAD: {
                logger.warn('Cannot toggle pause/resume while in dead state');
                break;
            }
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
