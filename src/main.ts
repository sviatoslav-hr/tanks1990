import './globals';
import './style.css';

import {createDevUI} from '#/dev-ui';
import {preloadEffectImages} from '#/entity/effect';
import {DEV_MODE_KEY, runGame} from '#/game';
import {GameInput} from '#/game-input';
import {initMenu} from '#/menu';
import {Renderer} from '#/renderer';
import {SoundManager} from '#/sound';
import {GameState} from '#/state';
import {GameStorage} from '#/storage';
import {World} from '#/world';

function main(): void {
    const appElement = document.querySelector<HTMLDivElement>('#app');
    assert(appElement, 'No app element found');

    const storage = new GameStorage(localStorage);
    window.__DEV_MODE = storage.getBool(DEV_MODE_KEY) ?? false;

    const sounds = new SoundManager(storage);
    sounds.loadAllSounds().then(() => console.log('All sounds loaded'));
    preloadEffectImages();

    const renderer = new Renderer();
    appElement.append(renderer.canvas);
    const camera = renderer.camera;

    const input = new GameInput();
    const world = new World(camera.getSizeRect(), storage, sounds, input);
    const gameState = new GameState(world);

    const menu = initMenu(gameState, sounds);
    appElement.append(menu);
    menu.showMain();
    menu.resize(renderer.canvas.clientWidth, renderer.canvas.clientHeight);

    const devUI = createDevUI(gameState, world, storage);
    appElement.append(devUI);

    runGame(gameState, world, menu, input, storage, devUI, renderer);
}

main();
