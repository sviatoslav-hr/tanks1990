import {DevUI, toggleDevPanelVisibility, toggleFPSVisibility} from '#/dev-ui';
import {GameInput} from '#/game-input';
import {Duration} from '#/math/duration';
import {Menu} from '#/menu';
import {saveBestScore} from '#/score';
import {GameStorage} from '#/storage';
import {World} from '#/world';
import {Renderer, toggleFullscreen} from '#/renderer';
import {GameState} from '#/state';

export const DEV_MODE_KEY = 'dev_mode';

export function runGame(
    state: GameState,
    world: World,
    menu: Menu,
    input: GameInput,
    storage: GameStorage,
    devUI: DevUI,
    renderer: Renderer,
) {
    renderer.resizeCanvas(window.innerWidth, window.innerHeight);
    input.listen(document.body);

    window.addEventListener('resize', () => {
        renderer.resizeCanvas(window.innerWidth, window.innerHeight);
        menu.resize(renderer.canvas.clientWidth, renderer.canvas.clientHeight);
    });

    let lastTimestamp = 0;
    const animationCallback = (timestamp: number): void => {
        const dt = Duration.since(lastTimestamp).min(1000 / 30);
        lastTimestamp = timestamp;
        renderer.render(state, input, storage);

        if (world.player.dead && state.playing && !menu.dead) {
            menu.showDead();
            saveBestScore(storage, world.player.score);
        }

        if (state.playing || state.debugUpdateTriggered) {
            world.update(dt, renderer.camera);
            if (world.isInfinite) {
                renderer.camera.centerOn(world.player);
            }
        }

        handleGameInput(input, renderer, state, world, menu, devUI, storage);
        input.tick();
        devUI.update(dt);
        state.reset();
        window.requestAnimationFrame(animationCallback);
    };

    window.requestAnimationFrame(animationCallback);
}

function handleGameInput(
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
