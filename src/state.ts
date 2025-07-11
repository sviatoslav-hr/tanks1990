import {
    activateRecording,
    RECORDING_VERSION,
    stopRecording,
    type RecordingInfo,
    type RecordingStatus,
} from '#/recording';

export enum GameStatus {
    INITIAL,
    PLAYING,
    PAUSED,
    DEAD,
}

// TODO: I'm not sure what this class is really for.
//       It seems to try to be a minimal state holder, but at the same time it's also responsive for recording.
//       It should be decided if this class should be minila or if it should handle everything that happens during state changes.
export class GameState {
    status = GameStatus.INITIAL;
    gameCompleted = false;
    debugUpdateTriggered = false;
    recording: RecordingStatus = {
        enabled: true,
        active: false,
        playing: false,
        playingInputIndex: 0,
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
        // NOTE: playing is set before the game starts, so it should be checked here.
        if (!this.recording.playing && this.recording.enabled) {
            activateRecording(this.recording, this.recordingInfo);
        }
        this.status = GameStatus.PLAYING;
    }

    markDead(): void {
        if (this.recording.active) {
            stopRecording(this.recording, true);
        }
        if (this.recording.playing) {
            this.recording.playing = false;
        }
        this.status = GameStatus.DEAD;
    }

    markCompleted(): void {
        if (this.recording.active) {
            stopRecording(this.recording, true);
        }
        if (this.recording.playing) {
            this.recording.playing = false;
        }
        this.gameCompleted = true;
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
