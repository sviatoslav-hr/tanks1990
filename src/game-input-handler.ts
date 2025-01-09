import {DEV_MODE_KEY} from '#/const';
import {DevUI, toggleDevPanelVisibility, toggleFPSVisibility} from '#/dev-ui';
import {GameInput} from '#/game-input';
import {Menu} from '#/menu';
import {Renderer, toggleFullscreen} from '#/renderer';
import {GameState} from '#/state';
import {GameStorage} from '#/storage';
import {World} from '#/world';

// TODO: Probably all keys handling should be here so it's centralized.
export function handleGameInputTick(
    input: GameInput,
    renderer: Renderer,
    state: GameState,
    world: World,
    menu: Menu,
    devUI: DevUI,
    storage: GameStorage,
) {
    if (input.isPressed('KeyB')) {
        world.showBoundary = !world.showBoundary;
    }

    if (state.paused && input.isPressed('BracketRight')) {
        menu.hide();
        state.debugUpdateTriggered = true;
    }

    if (input.isPressed('KeyP')) {
        if (state.dead) {
            menu.showMain();
        } else if (state.playing) {
            menu.showPause();
        } else {
            menu.hide();
        }
        state.togglePauseResume();
    }

    if (input.isPressed('KeyO')) {
        state.togglePauseResume();
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

    if (input.isPressed('KeyF')) {
        const appElement = renderer.canvas.parentElement;
        assert(appElement);
        toggleFullscreen(appElement)
            .then(() => {
                renderer.resizeCanvas(window.innerWidth, window.innerHeight);
                menu.resize(
                    renderer.canvas.clientWidth,
                    renderer.canvas.clientHeight,
                );
            })
            .catch((err) => console.error('Faile to toggle fullscreen', err));
    }
}
