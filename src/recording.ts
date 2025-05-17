import type {EntityManager} from '#/entity/manager';
import type {GameInputState} from '#/input-handler';
import {random} from '#/math/rng';
import type {Menu} from '#/menu';
import {notify, notifyError} from '#/notification';
import type {GameState} from '#/state';

export const RECORDING_VERSION = 0;

export interface RecordingStatus {
    active: boolean;
    expected: boolean;
    playing: boolean;
    inputIndex: number;
}

export interface RecordingInfo {
    version: number;
    seed: string;
    startedAt: number;
    inputs: GameInputState[];
}

export function toggleRecording(state: GameState): void {
    const isPlaying = state.paused || state.playing;
    const recording = state.recording;
    if (isPlaying) {
        if (recording.active) {
            recording.active = false;
            notify('Recording stopped');
        } else {
            notifyError('Cannot start recording while game is in playing state');
        }
    } else {
        recording.expected = !recording.expected;
        notify(recording.expected ? 'Recording enabled' : 'Recording disabled');
    }
}

export function maybeRecordInput(state: GameState, input: GameInputState): void {
    if (state.playing && state.recording.active && !state.recording.playing) {
        state.recordingInfo.inputs.push(input);
    }
}

export function resetRecording(state: GameState): void {
    state.recordingInfo.inputs = [];
    state.recording.active = false;
    state.recording.inputIndex = 0;
}

export function getNextRecordedInput(state: GameState): GameInputState | undefined {
    assert(state.recording.playing);
    const inputIndex = state.recording.inputIndex++;
    const inputs = state.recordingInfo.inputs;
    const input = inputs[inputIndex];
    if (inputIndex === inputs.length - 1) {
        // state.recording.playing = false;
        notify('Recording finished');
    }
    return input;
}

export function playRecentRecording(state: GameState, manager: EntityManager, menu: Menu): void {
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
    //       Instead I can put a flat to trigger this right before
    //       the next frame or immediately after the current frame.
    setTimeout(() => {
        state.recording.playing = true;
        state.recording.inputIndex = 0;
        random.reset(state.recordingInfo.seed);
        state.start();
        manager.init();
        menu.hide();
    }, 0);
}

export function exitRecording(state: GameState, menu: Menu): void {
    if (!state.recording.playing) {
        logger.error('Recording is not playing');
        return;
    }
    state.recording.playing = false;
    state.recording.active = false;
    state.init();
    menu.showMain();
    notify('Recording exited');
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
