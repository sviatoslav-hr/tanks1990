import {DEV_MODE_KEY} from '#/const';
import {DevUI, toggleDevPanelVisibility, toggleFPSVisibility} from '#/dev-ui';
import {notify} from '#/notification';
import {EntityManager} from '#/entity/manager';
import {GameInput} from '#/game-input';
import {Menu} from '#/menu';
import {Renderer} from '#/renderer';
import {GameState} from '#/state';
import {GameStorage} from '#/storage';

// TODO: Probably all keys handling should be here so it's centralized.
// TODO: At some point the key bindings should be separated from the specifics of the key handling.
// (e.g. Bindings code could fire events that are handled somewhere else)
export function handleGameInputTick(
    input: GameInput,
    renderer: Renderer,
    state: GameState,
    manager: EntityManager,
    menu: Menu,
    devUI: DevUI,
    storage: GameStorage,
) {
    if (state.playing) {
        manager.player.handleKeyboard(input);
    }
    if (input.isPressed('KeyF')) {
        renderer
            .toggleFullscreen(window)
            .catch((err) => logger.error('[Input] Failed to toggle fullscreen', err));
    }

    if (input.isPressed('KeyP') || input.isPressed('Escape')) {
        if (state.paused && !menu.paused) {
            menu.showPause();
        } else {
            if (!state.initial && !manager.player.dead) {
                if (state.playing) {
                    menu.showPause();
                } else {
                    menu.hide();
                }
            }
            state.togglePauseResume();
        }
    }

    if (input.isPressed('KeyO')) {
        if (!state.dead) {
            state.togglePauseResume();
        } else {
            logger.warn('[Input] Game is over, cannot pause/unpause');
        }
    }

    if (state.paused && input.isDown('BracketRight')) {
        if (menu.visible) {
            menu.hide();
        }
        state.debugUpdateTriggered = true;
    }

    if (input.isPressed('KeyB')) {
        manager.world.showBoundary = !manager.world.showBoundary;
        manager.world.markDirty();
    }

    if (input.isPressed('Semicolon')) {
        window.__DEV_MODE = !window.__DEV_MODE;
        storage.set(DEV_MODE_KEY, window.__DEV_MODE);
        notify(`Dev mode ${window.__DEV_MODE ? 'enabled' : 'disabled'}`);
    }

    const shiftDown = input.isDown('ShiftLeft');
    if (input.isPressed('Backquote') && !shiftDown) {
        toggleFPSVisibility(devUI.fpsMonitor, storage);
    }
    if (input.isPressed('Backquote') && shiftDown) {
        devUI.fpsMonitor.paused = !devUI.fpsMonitor.paused;
    }

    if (__DEV_MODE && input.isPressed('Backslash')) {
        toggleDevPanelVisibility(devUI.devPanel, storage);
    }

    if (__DEV_MODE && input.isDown('MouseMiddle')) {
        const mouseDelta = input.getMouseDelta();
        renderer.camera.manualMode = true;
        renderer.camera.worldOffset.add(mouseDelta.divideScalar(renderer.camera.scale));
    }
    const ctrlDevDown = __DEV_MODE && input.isDown('MetaLeft');

    // NOTE: Same as MouseMiddle but for touchpad
    if (ctrlDevDown && input.isDown('MouseLeft')) {
        const mouseDelta = input.getMouseDelta();
        renderer.camera.manualMode = true;
        renderer.camera.worldOffset.sub(mouseDelta);
    }
    if (ctrlDevDown && input.getMouseWheelDelta()) {
        const wheelDelta = input.getMouseWheelDelta();
        renderer.camera.manualMode = true;
        renderer.camera.setScale(renderer.camera.scale - wheelDelta * 0.001);
    }
    if (__DEV_MODE && input.isPressed('Digit0')) {
        renderer.camera.reset();
        renderer.camera.focusOnRect(manager.world.activeRoom.boundary);
    }
    if (__DEV_MODE && input.isPressed('Digit1')) {
        renderer.camera.manualMode = true;
        renderer.camera.setScale(1);
    }
    if (__DEV_MODE && input.isPressed('Digit2')) {
        renderer.camera.manualMode = true;
        renderer.camera.setScale(2);
    }
}
