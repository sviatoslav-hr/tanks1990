import {DEV_MODE_KEY} from '#/const';
import {DevUI, toggleDevPanelVisibility, toggleFPSVisibility} from '#/dev-ui';
import {GameInput} from '#/game-input';
import {Menu} from '#/menu';
import {Renderer} from '#/renderer';
import {GameState} from '#/state';
import {GameStorage} from '#/storage';
import {EntityManager} from '#/entity/manager';

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
            .catch((err) => console.error('Failed to toggle fullscreen', err));
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
        state.togglePauseResume();
    }

    if (state.paused && input.isDown('BracketRight')) {
        if (menu.visible) {
            menu.hide();
        }
        state.debugUpdateTriggered = true;
    }

    if (input.isPressed('KeyB')) {
        manager.world.showBoundary = !manager.world.showBoundary;
    }

    if (input.isPressed('Semicolon')) {
        window.__DEV_MODE = !window.__DEV_MODE;
        storage.set(DEV_MODE_KEY, window.__DEV_MODE);
        console.log(`Dev mode: ${window.__DEV_MODE ? 'ON' : 'OFF'}`);
    }

    if (input.isPressed('Backquote')) {
        toggleFPSVisibility(devUI.fpsMonitor, storage);
    }

    if (input.isPressed('Backslash')) {
        toggleDevPanelVisibility(devUI.devPanel, storage);
    }

    if (__DEV_MODE && input.isDown('MouseMiddle')) {
        const mouseDelta = input.getMouseDelta();
        renderer.camera.manualMode = true;
        renderer.camera.worldOffset.sub(mouseDelta);
    }
    const ctrlDevDown = __DEV_MODE && (input.isDown('ControlLeft') || input.isDown('MetaLeft'));

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
        renderer.camera.centerOn(
            manager.world.isInfinite ? manager.player : manager.world.boundary,
        );
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
