import './globals';
import './style.css';

import {APP_ELEMENT_ID, BASE_HEIGHT, BASE_WIDTH, DEV_MODE_KEY} from '#/const';
import {createDevUI} from '#/dev-ui';
import {preloadEffectImages} from '#/entity/effect';
import {runGame} from '#/game';
import {GameInput} from '#/game-input';
import {Rect} from '#/math';
import {initMenu} from '#/menu';
import {Renderer} from '#/renderer';
import {SoundManager} from '#/sound';
import {GameState} from '#/state';
import {GameStorage} from '#/storage';
import {World} from '#/world';

function main(): void {
    const appElement = document.getElementById(APP_ELEMENT_ID);
    assert(appElement, 'No app element found');

    const storage = new GameStorage(localStorage);
    window.__DEV_MODE = storage.getBool(DEV_MODE_KEY) ?? false;

    const sounds = new SoundManager(storage);
    sounds.loadAllSounds().then(() => console.log('All sounds loaded'));
    preloadEffectImages();

    const renderer = new Renderer();
    appElement.append(renderer.canvas);

    const input = new GameInput();
    const worldBoundary: Rect = {
        x: 0,
        y: 0,
        width: BASE_WIDTH,
        height: BASE_HEIGHT,
    };
    const world = new World(worldBoundary, storage, sounds, input);
    const gameState = new GameState(world);

    const menu = initMenu(gameState, sounds);
    appElement.append(menu);

    const devUI = createDevUI(gameState, world, storage);
    appElement.append(devUI);

    runGame(gameState, world, menu, input, storage, devUI, renderer);
}

main();
