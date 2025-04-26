import './globals';
import './style.css';

import {APP_ELEMENT_ID, DEV_MODE_KEY} from '#/const';
import {createDevUI, DevUI} from '#/dev-ui';
import {preloadEffectImages} from '#/entity/effect';
import {EntityManager} from '#/entity/manager';
import {GameInput} from '#/game-input';
import {handleGameInputTick} from '#/game-input-handler';
import {Duration} from '#/math/duration';
import {initMenu, Menu} from '#/menu';
import {Renderer} from '#/renderer';
import {updateScoreInMenu, drawScoreMini, saveBestScore} from '#/score';
import {SoundManager} from '#/sound';
import {GameState} from '#/state';
import {GameStorage} from '#/storage';
import {handleGameEvents} from './events-handler';
import {eventQueue} from '#/events';

main();

function main(): void {
    const appElement = document.getElementById(APP_ELEMENT_ID);
    assert(appElement, 'No app element found');

    const storage = new GameStorage(localStorage);
    window.__DEV_MODE = storage.getBool(DEV_MODE_KEY) ?? false;

    const sounds = new SoundManager(storage);
    sounds.loadAllSounds().then(() => console.log('[Sounds] All sounds loaded'));
    preloadEffectImages();

    const renderer = new Renderer();
    appElement.append(renderer.canvas);

    const input = new GameInput();
    const gameState = new GameState();
    const manager = new EntityManager();
    manager.world.load(storage);

    const menu = initMenu(gameState, manager, sounds);
    appElement.append(menu);

    const devUI = createDevUI(gameState, manager, storage);
    appElement.append(devUI);

    runGame(gameState, manager, menu, input, storage, devUI, renderer, sounds);
}

function runGame(
    state: GameState,
    manager: EntityManager,
    menu: Menu,
    input: GameInput,
    storage: GameStorage,
    devUI: DevUI,
    renderer: Renderer,
    sounds: SoundManager,
) {
    renderer.resizeCanvasByWindow(window);
    renderer.camera.focusOnRect(manager.world.activeRoom.boundary);
    menu.resize(renderer.canvas.offsetWidth, renderer.canvas.offsetHeight);
    menu.showMain();
    input.listen(document.body, renderer.canvas);

    window.addEventListener('resize', () => {
        renderer.resizeCanvasByWindow(window);
        renderer.camera.focusOnRect(manager.world.activeRoom.boundary);
        menu.resize(renderer.canvas.clientWidth, renderer.canvas.clientHeight);
    });

    let lastTimestamp = 0;
    const animationCallback = (timestamp: number): void => {
        devUI.fpsMonitor.beginMeasuring();
        const dt = Duration.since(lastTimestamp);
        // NOTE: Cap the delta time to 60fps. Otherwise the movement gets too during low FPS
        dt.min(1000 / 60);
        lastTimestamp = timestamp;

        try {
            handleGameTick(dt, state, manager, menu, storage, renderer);
            handleGameInputTick(input, renderer, state, manager, menu, devUI, storage);
            handleGameEvents(eventQueue, state, manager, sounds);
            if (manager.world.needsSaving) {
                manager.world.save(storage);
            }
            input.nextTick();
            state.nextTick();
        } catch (err) {
            console.error('Error in animationCallback', err);
        }
        devUI.fpsMonitor.endMeasuring();

        window.requestAnimationFrame(animationCallback);
    };

    window.requestAnimationFrame(animationCallback);
}

function handleGameTick(
    dt: Duration,
    state: GameState,
    manager: EntityManager,
    menu: Menu,
    storage: GameStorage,
    renderer: Renderer,
) {
    renderer.setFillColor(manager.world.bgColor);
    renderer.fillScreen();

    manager.drawAll(renderer);
    const player = manager.player;

    if (state.playing || (state.paused && !menu.visible)) {
        drawScoreMini(renderer, manager, storage);
    } else if (menu.visible) {
        updateScoreInMenu(menu, player, storage);
    }

    if (state.playing && player.dead) {
        state.markDead();
    }

    if (state.dead && !menu.dead) {
        menu.showDead();
        saveBestScore(storage, player.score);
    }

    if (state.playing || state.dead || state.debugUpdateTriggered) {
        manager.updateEffects(dt);
        manager.updateAll(dt, renderer.camera);
        // if (manager.world.isInfinite) {
        //     renderer.camera.centerOn(player);
        // }
    }
}
