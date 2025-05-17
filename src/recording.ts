import {notify, notifyError} from '#/notification';
import {GameState} from '#/state';
import {InputState} from './input-handler';

export function toggleRecording(state: GameState): void {
    const isPlaying = state.paused || state.playing;
    if (isPlaying) {
        if (state.isRecording) {
            state.isRecording = false;
            notify('Recording stopped');
        } else {
            notifyError('Cannot start recording while game is in playing state');
        }
    } else {
        if (state.recordingExpected) {
            notify('Recording disabled');
            state.recordingExpected = false;
        } else {
            notify('Recording enabled');
            state.recordingExpected = true;
        }
    }
}

export function pushInputState(state: GameState, input: InputState): void {
    if (state.playing) {
        state.inputs.push(input);
    }
}

export function resetInputState(state: GameState): void {
    state.inputs = [];
    state.isRecording = false;
}
