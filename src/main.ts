import './globals';
import './style.css';

import {Camera} from '#/camera';
import {
    createDevUI,
    toggleDevPanelVisibility,
    toggleFPSVisibility,
} from '#/dev-ui';
import {preloadEffectImages} from '#/entity/effect';
import {Game} from '#/game';
import {GameInput} from '#/game-input';
import {Vector2} from '#/math/vector';
import {initMenu} from '#/menu';
import {Renderer, toggleFullscreen} from '#/renderer';
import {SoundManager} from '#/sound';
import {GameStorage} from '#/storage';
import {assert} from '#/utils';
import {World} from '#/world';

function main(): void {
    const appElement = document.querySelector<HTMLDivElement>('#app');
    assert(appElement != null, 'No app element found');
    const storage = new GameStorage(localStorage);
    window.__DEV_MODE = storage.getBool(DEV_MODE_KEY) ?? false;

    const sounds = new SoundManager(storage);
    sounds.loadAllSounds().then(() => console.log('All sounds loaded'));
    preloadEffectImages();

    const renderer = new Renderer();
    appElement.append(renderer.canvas);

    const camera = new Camera(
        new Vector2(renderer.canvas.width, renderer.canvas.height),
    );
    const input = new GameInput();
    const world = new World(camera.sizeRect, storage, sounds, input);
    const game = new Game(world);

    const menu = initMenu(game, sounds);
    appElement.append(menu);
    menu.showMain();
    menu.resize(renderer.canvas.clientWidth, renderer.canvas.clientHeight);

    const devUI = createDevUI(game, world, storage);
    appElement.append(devUI);

    renderer.startAnimation(game, camera, input, menu, storage, devUI);

    window.addEventListener('resize', () => {
        renderer.resizeCanvas(window.innerWidth, window.innerHeight);
        menu.resize(renderer.canvas.clientWidth, renderer.canvas.clientHeight);
    });
    input.onKeydown('Semicolon', () => {
        window.__DEV_MODE = !window.__DEV_MODE;
        storage.set(DEV_MODE_KEY, window.__DEV_MODE);
        console.log(`Dev mode: ${window.__DEV_MODE ? 'ON' : 'OFF'}`);
    });
    input.onKeydown('Backquote', () =>
        toggleFPSVisibility(devUI.fpsMonitor, storage),
    );
    input.onKeydown('Backslash', () =>
        toggleDevPanelVisibility(devUI.devPanel, storage),
    );
    input.onKeydown('KeyF', () => {
        toggleFullscreen(appElement)
            .then(() => {
                renderer.resizeCanvas(window.innerWidth, window.innerHeight);
                menu.resize(
                    renderer.canvas.clientWidth,
                    renderer.canvas.clientHeight,
                );
            })
            .catch((err) => console.error('Faile to toggle fullscreen', err));
    });
}

const DEV_MODE_KEY = 'dev_mode';

main();
