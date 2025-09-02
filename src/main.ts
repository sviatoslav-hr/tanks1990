import './style.css';

import '#/globals';

import {logger} from '#/common/logger';
import {GameConfig} from '#/config';
import {APP_ELEMENT_ID, DEV_MODE_KEY} from '#/const';
import {drawGame, DrawGameOptions} from '#/drawing';
import {preloadEffectImages} from '#/effect';
import {EntityManager} from '#/entity/manager';
import {EventQueue} from '#/events';
import {handleGameEvents as processGameEvents} from '#/events-handler';
import {GameInput} from '#/input';
import {handleKeymaps, processInput} from '#/input-handler';
import {Duration} from '#/math/duration';
import {getURLSeed, random, setURLSeed} from '#/math/rng';
import {Menu, MenuBridge} from '#/menu';
import {isRecording, recordGameInput} from '#/recording';
import {Renderer} from '#/renderer';
import {initEntities, simulateEntities} from '#/simulation';
import {SoundManager} from '#/sound';
import {GameState, justCompletedGame} from '#/state';
import {GameStorage} from '#/storage';
import {uiGlobal} from '#/ui/core';
import {createDevUI, DevUI} from '#/ui/dev';
import {createNotificationBar, notify} from '#/ui/notification';
import {World} from '#/world/world';

main();

function main(): void {
    const appElement = document.getElementById(APP_ELEMENT_ID);
    assert(appElement, 'No app element found');

    createNotificationBar(uiGlobal, appElement);

    const storage = new GameStorage(localStorage);
    __DEV_MODE = storage.getBool(DEV_MODE_KEY) ?? false;
    if (__DEV_MODE) notify('Dev mode is on', {timeoutMs: 500});

    const sounds = new SoundManager(storage);
    sounds.loadAllSounds().then(() => logger.debug('[Sounds] All sounds loaded'));
    preloadEffectImages();

    const gameState = new GameState();

    const input = new GameInput();
    const manager = new EntityManager();
    const eventQueue = new EventQueue();
    const config = new GameConfig(storage);
    config.load();

    const renderer = new Renderer(gameState.playerCamera);
    appElement.append(renderer.canvas);

    const menu = new MenuBridge(eventQueue);
    {
        menu.volume.set(sounds.volume);
        menu.volume.subscribe((value) => sounds.updateVolume(value));
        menu.muted.set(sounds.storedMuted);
        menu.muted.subscribe((muted) => (muted ? sounds.suspend() : sounds.resume()));
        Menu(uiGlobal, menu.props()).appendTo(appElement);
    }

    const devUI = createDevUI(gameState, manager, renderer, storage);
    appElement.append(devUI);

    resizeGame(renderer, gameState, manager.world);
    window.addEventListener('resize', () => resizeGame(renderer, gameState, manager.world));

    input.listen(document.body, renderer.canvas);
    runGame(gameState, config, manager, menu, input, storage, devUI, renderer, sounds, eventQueue);
}

function runGame(
    state: GameState,
    config: GameConfig,
    manager: EntityManager,
    menu: MenuBridge,
    input: GameInput,
    storage: GameStorage,
    devUI: DevUI,
    renderer: Renderer,
    sounds: SoundManager,
    eventQueue: EventQueue,
) {
    const seed = getURLSeed();
    random.reset(seed ?? undefined);
    setURLSeed(random.seed);
    initEntities(manager);
    let lastTimestamp = performance.now();
    const animationCallback = (): void => {
        const now = performance.now();
        const dt = Duration.between(lastTimestamp, now);
        dt.min(1000 / 50); // NOTE: Cap the dt to 50fps. Otherwise the movement gets janky.
        lastTimestamp = now;

        devUI.fpsMonitor.begin();
        const drawOptions: DrawGameOptions = {drawUI: false};
        try {
            const inputState = handleKeymaps(state, input);
            if (state.recording.playing) {
                // TODO: This substitution is not perfect and may make the game feel faster/slower than original recording.
                //       But it's fine since it's only used for testing purposes and logically game replays as expected.
                dt.setSeconds(state.recording.currentInput?.dt ?? 0);
            }

            if (menu.fullscreenToggleExpected) {
                inputState.extra.toggleFullscreen ||= true;
                menu.fullscreenToggleExpected = false;
            }
            processInput(
                inputState,
                renderer,
                state,
                config,
                manager,
                menu,
                devUI,
                storage,
                eventQueue,
            );
            if (isRecording(state)) recordGameInput(state, dt, inputState.game);

            drawOptions.drawUI = !menu.visible;
            drawGame(renderer, config, manager, drawOptions);
            simulateGameTick(dt, state, manager, eventQueue);
            processGameEvents(eventQueue, state, manager, sounds, menu);
            state.nextTick();
            input.nextTick();
        } catch (err) {
            logger.error('Error in animationCallback\n%O', err);
        }
        devUI.fpsMonitor.end();
        if (config.changed) config.save();

        window.requestAnimationFrame(animationCallback);
    };

    window.requestAnimationFrame(animationCallback);
}

function simulateGameTick(
    dt: Duration,
    state: GameState,
    manager: EntityManager,
    events: EventQueue,
) {
    const player = manager.player;

    if (state.playing && player.dead && player.healthAnimation.finished) {
        events.push({type: 'game-control', action: 'game-over'});
    }

    if (!player.dead && justCompletedGame(state, manager.world.activeRoom)) {
        events.push({type: 'game-control', action: 'game-completed'});
    }

    // NOTE: Showing enemies moving even when it's game-over to kind of troll the player "they continue living while you are dead".
    if (state.playing || state.dead || state.debugUpdateTriggered) {
        simulateEntities(dt, manager, state.playerCamera, events);
    }
}

function resizeGame(renderer: Renderer, state: GameState, world: World): void {
    renderer.resizeCanvasByWindow(window);
    state.playerCamera.screenSize.set(renderer.canvas.width, renderer.canvas.height);
    state.devCamera.screenSize.set(renderer.canvas.width, renderer.canvas.height);
    state.playerCamera.focusOnRect(world.activeRoom.boundary);
}
