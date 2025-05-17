import {notify, notifyError} from '#/notification';
import type {GameState} from '#/state';
import type {InputState} from '#/input-handler';

export interface RecordingInfo {
    active: boolean;
    expected: boolean;
    inputs: InputState[];
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

export function maybeRecordInput(state: GameState, input: InputState): void {
    if (state.playing && state.recording.active) {
        state.recording.inputs.push(input);
    }
}

export function resetRecording(state: GameState): void {
    state.recording.inputs = [];
    state.recording.active = false;
}
