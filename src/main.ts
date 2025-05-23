import './globals';
import './style.css';

import {APP_ELEMENT_ID, DEV_MODE_KEY} from '#/const';
import {createDevUI, DevUI} from '#/dev-ui';
import {preloadEffectImages} from '#/entity/effect';
import {EntityManager} from '#/entity/manager';
import {eventQueue} from '#/events';
import {handleGameEvents as processGameEvents} from '#/events-handler';
import {GameInput} from '#/input';
import {processInput, handleKeymaps} from '#/input-handler';
import {logger} from '#/logger';
import {Duration} from '#/math/duration';
import {initMenu, Menu} from '#/menu';
import {getNotificationBar} from '#/notification';
import {maybeRecordInput} from '#/recording';
import {Renderer} from '#/renderer';
import {drawScoreMini, getBestScore, saveBestScore, updateScoreInMenu} from '#/score';
import {SoundManager} from '#/sound';
import {GameState} from '#/state';
import {GameStorage} from '#/storage';

main();

function main(): void {
    const appElement = document.getElementById(APP_ELEMENT_ID);
    assert(appElement, 'No app element found');
    appElement.append(getNotificationBar());

    const storage = new GameStorage(localStorage);
    window.__DEV_MODE = storage.getBool(DEV_MODE_KEY) ?? false;

    const sounds = new SoundManager(storage);
    sounds.loadAllSounds().then(() => logger.debug('[Sounds] All sounds loaded'));
    preloadEffectImages();

    const renderer = new Renderer();
    appElement.append(renderer.canvas);

    const input = new GameInput();
    const gameState = new GameState();
    const manager = new EntityManager();
    manager.world.load(storage);
    manager.bestScore = getBestScore(storage);

    const menu = initMenu(gameState, manager, sounds);
    appElement.append(menu);
    logger.info('Dev mode is %s', window.__DEV_MODE ? 'on' : 'off');

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

    const perfectDt = 1000 / 60;
    let fpsLimiterEnabled = false;
    let allowedDtOverflow = 1000 / 60 - 1000 / 65; // NOTE: Allow to get 5 more that perfectDt
    let lastTimestamp = performance.now();
    const animationCallback = (): void => {
        const now = performance.now();
        const dt = Duration.between(lastTimestamp, now);
        dt.min(1000 / 50); // NOTE: Cap the dt to 50fps. Otherwise the movement gets janky.
        const dtOverflow = perfectDt - dt.milliseconds;
        if (fpsLimiterEnabled && dtOverflow > allowedDtOverflow) {
            setTimeout(animationCallback, dtOverflow - allowedDtOverflow);
            return;
        }
        lastTimestamp = now;

        devUI.fpsMonitor.begin();
        try {
            const inputState = handleKeymaps(state, input, menu);
            if (state.recording.playing) {
                dt.setMilliseconds(inputState.game.dt ?? 0);
            } else {
                inputState.game.dt = dt.milliseconds;
            }
            processInput(inputState, renderer, state, manager, menu, devUI, storage);
            maybeRecordInput(state, inputState.game);

            simulateGameTick(dt, state, manager, menu, storage, renderer);
            processGameEvents(eventQueue, state, manager, sounds);
            if (manager.world.needsSaving) {
                manager.world.save(storage);
            }
            input.endTick();
            state.nextTick();
        } catch (err) {
            logger.error('Error in animationCallback %O', err);
        }
        devUI.fpsMonitor.end();

        window.requestAnimationFrame(animationCallback);
    };

    window.requestAnimationFrame(animationCallback);
}

function simulateGameTick(
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
        drawScoreMini(renderer, manager);
    } else if (menu.visible && !state.initial) {
        updateScoreInMenu(menu, manager);
    }

    if (state.playing && player.dead) {
        const playedRecording = state.recording.playing;
        state.markDead();
        if (!playedRecording) menu.showDead();
        saveBestScore(storage, manager);
    }

    if (state.playing || state.dead || state.debugUpdateTriggered) {
        manager.updateEffects(dt);
        manager.updateAll(dt, renderer.camera);
    }
}
