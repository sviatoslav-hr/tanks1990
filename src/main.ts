import './globals';
import './style.css';

import {Color} from '#/color';
import {APP_ELEMENT_ID, BASE_HEIGHT, BASE_WIDTH, DEV_MODE_KEY} from '#/const';
import {createDevUI, DevUI} from '#/dev-ui';
import {preloadEffectImages} from '#/entity/effect';
import {GameInput} from '#/game-input';
import {handleGameInputTick} from '#/game-input-handler';
import {Rect} from '#/math';
import {Duration} from '#/math/duration';
import {initMenu, Menu} from '#/menu';
import {Renderer} from '#/renderer';
import {drawScore, saveBestScore} from '#/score';
import {SoundManager} from '#/sound';
import {GameState} from '#/state';
import {GameStorage} from '#/storage';
import {World} from '#/world';

main();

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
        x: -BASE_WIDTH / 2,
        y: -BASE_HEIGHT / 2,
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

function runGame(
    state: GameState,
    world: World,
    menu: Menu,
    input: GameInput,
    storage: GameStorage,
    devUI: DevUI,
    renderer: Renderer,
) {
    renderer.resizeCanvasByWindow(window);
    renderer.camera.focusOnRect(world.boundary);
    menu.resize(renderer.canvas.offsetWidth, renderer.canvas.offsetHeight);
    menu.showMain();
    input.listen(document.body, renderer.canvas);

    window.addEventListener('resize', () => {
        renderer.resizeCanvasByWindow(window);
        menu.resize(renderer.canvas.clientWidth, renderer.canvas.clientHeight);
    });

    let lastTimestamp = 0;
    const animationCallback = (timestamp: number): void => {
        const dt = Duration.since(lastTimestamp).min(1000 / 30);
        lastTimestamp = timestamp;

        try {
            handleGameTick(dt, state, world, menu, input, storage, renderer);
            handleGameInputTick(
                input,
                renderer,
                state,
                world,
                menu,
                devUI,
                storage,
            );
            devUI.update(dt);
            input.nextTick();
            state.nextTick();
        } catch (err) {
            console.error('Error in animationCallback', err);
        }

        window.requestAnimationFrame(animationCallback);
    };

    window.requestAnimationFrame(animationCallback);
}

function handleGameTick(
    dt: Duration,
    state: GameState,
    world: World,
    menu: Menu,
    input: GameInput,
    storage: GameStorage,
    renderer: Renderer,
) {
    renderer.setFillColor(Color.BLACK_RAISIN);
    renderer.fillScreen();

    world.draw(renderer);

    if (state.paused || state.dead || (state.playing && input.isDown('KeyQ'))) {
        drawScore(renderer, world.player, storage);
    }

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
}
