import './style.css';

import '#/globals';

import {logger} from '#/common/logger';
import {APP_ELEMENT_ID, DEV_MODE_KEY} from '#/const';
import {drawGame, DrawGameOptions} from '#/drawing';
import {preloadEffectImages} from '#/effect';
import {handleGameEvents as processGameEvents} from '#/events-handler';
import {GameInput} from '#/input';
import {handleKeymaps, processInput} from '#/input-handler';
import {Duration} from '#/math/duration';
import {getURLSeed, random, setURLSeed} from '#/math/rng';
import {Menu, MenuBridge} from '#/menu';
import {
    isRecordingPlaybackActive,
    maybeRecordGameInput,
    scheduleNextRecordedFrame,
} from '#/recording';
import {Renderer} from '#/renderer';
import {effect} from '#/signals';
import {simulateEntities} from '#/simulation';
import {loadAllSounds, resumeAllSounds, setAllSoundsVolume, suspendAllSounds} from '#/sound';
import {
    checkGameCompletion,
    GameState,
    initGame,
    isDead,
    isPlaying,
    newGameState,
    resetGameAfterTick,
} from '#/state';
import {GameStorage} from '#/storage';
import {createDevUI, DevUI} from '#/ui/dev';
import {createNotificationBar, notify} from '#/ui/notification';
import {createWContext, mountWComponent} from '#/ui/w';

main();

function main(): void {
    const appElement = document.getElementById(APP_ELEMENT_ID);
    assert(appElement, 'No app element found');

    const w = createWContext();
    createNotificationBar(w, document.body);

    const storage = new GameStorage(localStorage);
    __DEV_MODE = storage.getBool(DEV_MODE_KEY) ?? false;
    if (__DEV_MODE) notify('Dev mode is on', {timeoutMs: 500});

    const state = newGameState(storage);
    const sounds = state.sounds;

    loadAllSounds(sounds).then(() => logger.debug('[Sounds] All sounds loaded'));
    preloadEffectImages();

    const renderer = new Renderer(state.playerCamera);
    appElement.append(renderer.canvas);

    const menu = new MenuBridge(state.events);
    {
        menu.volume.set(sounds.volume);
        effect(() => {
            setAllSoundsVolume(sounds, menu.volume());
        });
        menu.muted.set(sounds.initiallyMuted);
        effect(() => {
            if (menu.muted()) suspendAllSounds(sounds);
            else resumeAllSounds(sounds);
        });
        mountWComponent(w, Menu(menu.props()), appElement);
    }

    const devUI = createDevUI(state, renderer, storage);
    appElement.append(devUI);

    resizeGame(renderer, state);
    window.addEventListener('resize', () => resizeGame(renderer, state));

    const input = new GameInput();
    input.listen(document.body, renderer.canvas);
    runGame(state, menu, input, devUI, renderer);
}

function runGame(
    state: GameState,
    menu: MenuBridge,
    input: GameInput,
    devUI: DevUI,
    renderer: Renderer,
) {
    const seed = getURLSeed();
    random.reset(seed ?? undefined);
    setURLSeed(random.seed);
    let lastTimestamp = performance.now();
    initGame(state);
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
                inputState.extra.toggleFullscreen = true;
                menu.fullscreenToggleExpected = false;
            }
            processInput(inputState, renderer, state, menu, devUI);
            maybeRecordGameInput(state, dt, inputState.game);

            if (isPlaying(state) || isDead(state) || state.debugUpdateTickTriggered) {
                // NOTE: Showing enemies moving even when it's game-over to kind of troll the player "they continue living while you are dead".
                simulateEntities(dt, state, state.playerCamera);
                checkGameCompletion(state); // pushes events
            }

            drawOptions.drawUI = !menu.visible;
            drawGame(renderer, state, drawOptions);

            processGameEvents(state, menu);
            resetGameAfterTick(state);
            input.nextTick();
        } catch (err) {
            logger.error('Error in animationCallback\n%O', err);
        }
        devUI.fpsMonitor.end(); // TODO: This does not get into account playing speed mult.

        let nextFrameScheduled = false;
        if (isPlaying(state) && isRecordingPlaybackActive(state)) {
            nextFrameScheduled = scheduleNextRecordedFrame(state, animationCallback);
        }

        if (!nextFrameScheduled) {
            window.requestAnimationFrame(animationCallback);
        }
    };

    window.requestAnimationFrame(animationCallback);
}

function resizeGame(renderer: Renderer, state: GameState): void {
    renderer.resizeCanvas(window.innerWidth, window.innerHeight);
    state.playerCamera.screenSize.set(renderer.canvas.width, renderer.canvas.height);
    state.devCamera.screenSize.set(renderer.canvas.width, renderer.canvas.height);
    state.playerCamera.focusOnRect(state.world.activeRoom.boundary);
}
