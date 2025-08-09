import type {EntityManager} from '#/entity/manager';
import type {GameInputState} from '#/input-handler';
import {random} from '#/math/rng';
import {MenuBridge} from '#/menu2';
import type {GameState} from '#/state';
import {notify} from '#/ui/notification';

export const RECORDING_VERSION = 0.1;

export interface RecordingStatus {
    /** Indicates whether the next game sessions should be recorded. */
    enabled: boolean;
    /** Indicates whether the current game session is currently being recorded. */
    active: boolean;
    playing: boolean;
    playingInputIndex: number;
}

export interface RecordingInfo {
    version: number;
    commitHash: string;
    seed: string;
    startedAt: number;
    inputs: GameInputState[];
}

export function activateRecording(recording: RecordingStatus, info: RecordingInfo): void {
    assert(!recording.playing && recording.enabled);
    resetRecording(recording, info);
    recording.active = true;
    info.seed = random.seed;
    info.startedAt = Date.now();
}

function resetRecording(recording: RecordingStatus, info: RecordingInfo): void {
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

export function maybeRecordInput(state: GameState, input: GameInputState): void {
    if (state.playing && state.recording.active && !state.recording.playing) {
        state.recordingInfo.inputs.push(input);
    }
}

export function getNextRecordedInput(state: GameState): GameInputState | undefined {
    assert(state.recording.playing);
    const inputIndex = state.recording.playingInputIndex++;
    const inputs = state.recordingInfo.inputs;
    const input = inputs[inputIndex];
    if (inputIndex === inputs.length - 1) {
        // state.recording.playing = false;
        notify('Recording finished');
    }
    return input;
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
    if (!state.recordingInfo.inputs.length) {
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
        random.reset(state.recordingInfo.seed);
        state.start();
        manager.init();
        menu.page.set(null);
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
    menu.page.set('home');
    notify('Recording playback stopped');
}

export function importRecording(state: GameState, data: string): void {
    const recordingInfo = JSON.parse(data) as RecordingInfo;
    if (recordingInfo.version !== RECORDING_VERSION) {
        logger.error('Invalid recording version');
        return;
    }
    state.recordingInfo = recordingInfo;
    notify('Recording imported');
}
