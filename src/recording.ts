import type {EntityManager} from '#/entity/manager';
import type {GameInputState} from '#/input-handler';
import {Duration} from '#/math/duration';
import {random} from '#/math/rng';
import {MenuBridge} from '#/menu';
import {initEntities} from '#/simulation';
import type {GameState} from '#/state';
import {notify} from '#/ui/notification';

export interface RecordingStatus {
    /** Indicates whether the next game sessions should be recorded. */
    enabled: boolean;
    /** Indicates whether the current game session is currently being recorded. */
    active: boolean;
    playing: boolean;
    playingInputIndex: number;
    playingSpeedMult: number;
    currentInput: RecordedInputInfo | null;
}

export interface RecordingData {
    version: string;
    commitHash: string;
    seed: string;
    startedAt: number;
    inputs: RecordedInputInfo[];
}

export interface RecordedInputInfo extends GameInputState {
    dt: number;
}

export function activateRecording(recording: RecordingStatus, info: RecordingData): void {
    assert(!recording.playing && recording.enabled);
    resetRecording(recording, info);
    recording.active = true;
    info.seed = random.seed;
    info.startedAt = Date.now();
}

function resetRecording(recording: RecordingStatus, info: RecordingData): void {
    info.inputs = [];
    recording.active = false;
    recording.playingInputIndex = 0;
}

export function stopRecording(recording: RecordingStatus, skipNotification = false): void {
    assert(recording.active);
    recording.active = false;
    if (__DEV_MODE && !skipNotification) notify('Recording stopped');
}

export function toggleRecordingEnabled(recording: RecordingStatus): void {
    if (recording.active) stopRecording(recording);
    recording.enabled = !recording.enabled;
    notify(recording.enabled ? 'Recording enabled' : 'Recording disabled');
}

export function toggleRecordingEnabledOrStop(state: GameState): void {
    const recording = state.recording;
    if ((state.paused || state.playing) && recording.active) {
        stopRecording(recording);
    } else {
        toggleRecordingEnabled(recording);
    }
}

export function isRecordingGameInputs(state: GameState): boolean {
    const result = state.playing && state.recording.active && !state.recording.playing;
    return result;
}

export function recordGameInput(state: GameState, dt: Duration, input: GameInputState): void {
    assert(isRecordingGameInputs(state));
    state.recordingData.inputs.push({...input, dt: dt.seconds});
}

export function getNextRecordedFrameDt(state: GameState): number | null {
    assert(state.recording.playing);
    const index = Math.min(
        state.recording.playingInputIndex,
        state.recordingData.inputs.length - 1,
    );
    const input = state.recordingData.inputs[index];
    return input?.dt ?? null;
}

export function getNextRecordedInput(
    recording: RecordingStatus,
    data: RecordingData,
): GameInputState | undefined {
    assert(recording.playing);
    const inputIndex = recording.playingInputIndex;
    const inputs = data.inputs;
    const input = inputs[inputIndex];
    recording.currentInput = input ?? null;
    if (inputIndex === inputs.length - 1) {
        notify('Recording finished');
    }
    return input;
}

export function isPlayingRecordingFinished(state: GameState): boolean {
    const index = state.recording.playingInputIndex;
    const result =
        state.playing && state.recording.playing && index >= state.recordingData.inputs.length;
    return result;
}

// TODO: Menu should not be passed here, but rather it should be handled via events.
export function playRecentRecording(
    state: GameState,
    manager: EntityManager,
    menu: MenuBridge,
): void {
    if (state.recording.playing) {
        logger.error('Recording is already playing');
        return;
    }
    if (!state.recordingData.inputs.length) {
        logger.error('No recording to play');
        return;
    }
    notify('Playing recording');
    // TODO: It's probably best to avoid asynchronous code.
    //       Instead, I can put a flag to trigger this right before
    //       the next frame or immediately after the current frame.
    setTimeout(() => {
        state.recording.playing = true;
        state.recording.playingInputIndex = 0;
        random.reset(state.recordingData.seed);
        state.start();
        initEntities(manager);
        menu.view.set(null);
    }, 0);
}

export function exitRecording(state: GameState, menu: MenuBridge): void {
    if (!state.recording.playing) {
        logger.warn('Recording is not being played');
        return;
    }
    state.recording.playing = false;
    state.recording.active = false;
    state.init();
    menu.view.set('main');
    notify('Recording playback stopped');
}

export function importRecording(state: GameState, data: string): void {
    const recordingInfo = JSON.parse(data) as RecordingData;
    if (recordingInfo.version !== GAME_VERSION) {
        logger.error('Unsupported game version "%s" in the recording', recordingInfo.version);
        return;
    }
    state.recordingData = recordingInfo;
    notify('Recording imported');
}
