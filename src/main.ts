import './style.css';

import '#/globals';

import {logger} from '#/common/logger';
import {GameConfig} from '#/config';
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
    getNextRecordedFrameDt,
    isPlayingRecordingFinished,
    isRecordingGameInputs,
    recordGameInput,
} from '#/recording';
import {Renderer} from '#/renderer';
import {initEntities, simulateEntities} from '#/simulation';
import {SoundManager} from '#/sound';
import {GameState, justCompletedGame} from '#/state';
import {GameStorage} from '#/storage';
import {uiGlobal} from '#/ui/core';
import {createDevUI, DevUI} from '#/ui/dev';
import {createNotificationBar, notify} from '#/ui/notification';

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

    const state = new GameState(sounds);

    const input = new GameInput();
    const config = new GameConfig(storage);
    config.load();

    const renderer = new Renderer(state.playerCamera);
    appElement.append(renderer.canvas);

    const menu = new MenuBridge(state.events);
    {
        menu.volume.set(sounds.volume);
        menu.volume.subscribe((value) => sounds.updateVolume(value));
        menu.muted.set(sounds.storedMuted);
        menu.muted.subscribe((muted) => (muted ? sounds.suspend() : sounds.resume()));
        Menu(uiGlobal, menu.props()).appendTo(appElement);
    }

    const devUI = createDevUI(state, renderer, storage);
    appElement.append(devUI);

    resizeGame(renderer, state);
    window.addEventListener('resize', () => resizeGame(renderer, state));

    input.listen(document.body, renderer.canvas);
    runGame(state, config, menu, input, storage, devUI, renderer, sounds);
}

function runGame(
    state: GameState,
    config: GameConfig,
    menu: MenuBridge,
    input: GameInput,
    storage: GameStorage,
    devUI: DevUI,
    renderer: Renderer,
    sounds: SoundManager,
) {
    const seed = getURLSeed();
    random.reset(seed ?? undefined);
    setURLSeed(random.seed);
    initEntities(state);
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
                inputState.extra.toggleFullscreen = true;
                menu.fullscreenToggleExpected = false;
            }
            processInput(inputState, renderer, state, config, menu, devUI, storage);
            if (isRecordingGameInputs(state)) recordGameInput(state, dt, inputState.game);

            // NOTE: It's better to just stop simulation after recording has finished playing.
            if (!state.recording.playing || !isPlayingRecordingFinished(state)) {
                simulateGameTick(dt, state);
            }

            drawOptions.drawUI = !menu.visible;
            drawGame(renderer, config, state, drawOptions);

            processGameEvents(state, sounds, menu);
            state.nextTick();
            input.nextTick();
        } catch (err) {
            logger.error('Error in animationCallback\n%O', err);
        }
        devUI.fpsMonitor.end();
        if (config.changed) config.save();

        let nextFrameManualDt: number | null = null;
        if (state.recording.playing) {
            nextFrameManualDt = getNextRecordedFrameDt(state);
        }

        if (nextFrameManualDt == null) {
            window.requestAnimationFrame(animationCallback);
        } else {
            state.recording.playingInputIndex++;
            setTimeout(
                animationCallback,
                (nextFrameManualDt * 1000) / state.recording.playingSpeedMult,
            );
        }
    };

    window.requestAnimationFrame(animationCallback);
}

function simulateGameTick(dt: Duration, state: GameState) {
    const player = state.player;

    if (state.playing && player.dead && player.healthAnimation.finished) {
        state.events.push({type: 'game-control', action: 'game-over'});
    }

    if (!player.dead && justCompletedGame(state, state.world.activeRoom)) {
        state.events.push({type: 'game-control', action: 'game-completed'});
    }

    // NOTE: Showing enemies moving even when it's game-over to kind of troll the player "they continue living while you are dead".
    if (state.playing || state.dead || state.debugUpdateTriggered) {
        simulateEntities(dt, state, state.playerCamera);
    }
}

function resizeGame(renderer: Renderer, state: GameState): void {
    renderer.resizeCanvas(window.innerWidth, window.innerHeight);
    state.playerCamera.screenSize.set(renderer.canvas.width, renderer.canvas.height);
    state.devCamera.screenSize.set(renderer.canvas.width, renderer.canvas.height);
    state.playerCamera.focusOnRect(state.world.activeRoom.boundary);
}
