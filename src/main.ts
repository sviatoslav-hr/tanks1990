import './globals';
import './style.css';

import {logger} from '#/common/logger';
import {APP_ELEMENT_ID, DEV_MODE_KEY} from '#/const';
import {preloadEffectImages} from '#/effect';
import {EntityManager} from '#/entity/manager';
import {eventQueue} from '#/events';
import {handleGameEvents as processGameEvents} from '#/events-handler';
import {GameInput} from '#/input';
import {handleKeymaps, processInput} from '#/input-handler';
import {Duration} from '#/math/duration';
import {initMenu, Menu} from '#/menu';
import {maybeRecordInput} from '#/recording';
import {Renderer} from '#/renderer';
import {SoundManager} from '#/sound';
import {GameState} from '#/state';
import {GameStorage} from '#/storage';
import {createDevUI, DevUI} from '#/ui/dev';
import {getNotificationBar, notify} from '#/ui/notification';
import {Room} from '#/world';

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

    const menu = initMenu(gameState, manager, sounds);
    appElement.append(menu);
    logger.info('Dev mode is %s', window.__DEV_MODE ? 'on' : 'off');

    const devUI = createDevUI(gameState, manager, renderer, storage);
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

            simulateGameTick(dt, state, manager, menu, renderer);
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
    renderer: Renderer,
) {
    renderer.setFillColor(manager.world.bgColor);
    renderer.fillScreen();

    manager.drawAll(renderer);
    const player = manager.player;

    if (state.playing && player.dead && player.healthAnimation.finished) {
        const playedRecording = state.recording.playing;
        state.markDead();
        if (!playedRecording) menu.showDead();
    }

    if (!player.dead && justCompletedGame(state, manager.world.activeRoom)) {
        player.completedGame = true;
        state.markCompleted();
        notify('Congratulation!');
        notify(`Completed in ${player.survivedFor.toHumanString()}`);
    }

    if (state.playing || state.dead || state.debugUpdateTriggered) {
        manager.updateEffects(dt);
        manager.updateAllEntities(dt, renderer.camera);
    }
}

function justCompletedGame(state: GameState, room: Room): boolean {
    return state.playing && !state.gameCompleted && room.completed && !room.nextRoom;
}
