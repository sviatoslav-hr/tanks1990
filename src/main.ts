import './globals';
import './style.css';

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
import {initMenu, Menu} from '#/menu';
import {maybeRecordInput} from '#/recording';
import {Renderer} from '#/renderer';
import {Camera} from '#/renderer/camera';
import {type Sound, SoundManager, SoundType} from '#/sound';
import {GameState, justCompletedGame} from '#/state';
import {GameStorage} from '#/storage';
import {createDevUI, DevUI} from '#/ui/dev';
import {getNotificationBar, notify} from '#/ui/notification';
import {World} from '#/world/world';

main();

function main(): void {
    const appElement = document.getElementById(APP_ELEMENT_ID);
    assert(appElement, 'No app element found');
    appElement.append(getNotificationBar());

    const storage = new GameStorage(localStorage);
    __DEV_MODE = storage.getBool(DEV_MODE_KEY) ?? false;
    if (__DEV_MODE) notify('Dev mode is on', {timeoutMs: 1000});

    const sounds = new SoundManager(storage);
    sounds.loadAllSounds().then(() => logger.debug('[Sounds] All sounds loaded'));
    preloadEffectImages();

    const renderer = new Renderer();
    appElement.append(renderer.canvas);

    const input = new GameInput();
    const gameState = new GameState();
    const manager = new EntityManager();
    const eventQueue = new EventQueue();
    const config = new GameConfig(storage);
    config.load();

    const menu = initMenu(eventQueue, sounds);
    appElement.append(menu);

    const devUI = createDevUI(gameState, manager, renderer, storage);
    appElement.append(devUI);

    resizeGame(renderer, menu, manager.world);
    window.addEventListener('resize', () => resizeGame(renderer, menu, manager.world));

    menu.showMain();
    input.listen(document.body, renderer.canvas);
    runGame(gameState, config, manager, menu, input, storage, devUI, renderer, sounds, eventQueue);
}

function runGame(
    state: GameState,
    config: GameConfig,
    manager: EntityManager,
    menu: Menu,
    input: GameInput,
    storage: GameStorage,
    devUI: DevUI,
    renderer: Renderer,
    sounds: SoundManager,
    eventQueue: EventQueue,
) {
    let battleSound: Sound | undefined;

    let lastTimestamp = performance.now();
    const animationCallback = (): void => {
        const now = performance.now();
        const dt = Duration.between(lastTimestamp, now);
        dt.min(1000 / 50); // NOTE: Cap the dt to 50fps. Otherwise the movement gets janky.
        lastTimestamp = now;

        devUI.fpsMonitor.begin();
        const drawOptions: DrawGameOptions = {drawUI: false};
        try {
            const inputState = handleKeymaps(state, input, menu);
            if (state.recording.playing) {
                // TODO: This substitution is not perfect and may make the game feel faster/slower than original recording.
                //       But it's fine since it's only used for testing purposes and logically game replays as expected.
                dt.setMilliseconds(inputState.game.dt ?? 0);
            } else {
                inputState.game.dt = dt.milliseconds;
            }
            processInput(
                inputState,
                config,
                renderer,
                state,
                manager,
                menu,
                devUI,
                storage,
                eventQueue,
            );
            maybeRecordInput(state, inputState.game);

            // TODO: This is pretty bad, this code should not be in main.
            //       Probably the best way to handle this is use play sound based on game events.
            if (state.playing) {
                const soundVolume = 0.5;
                const loop = true;
                if (!battleSound) {
                    battleSound = sounds.playSound(SoundType.BATTLE_THEME, soundVolume, loop);
                } else if (battleSound.paused) {
                    battleSound.resume();
                } else if (!battleSound.isPlaying) {
                    battleSound.play(soundVolume, loop);
                }
            } else if (state.paused && battleSound?.isPlaying) {
                battleSound.pause();
            } else if (battleSound?.isPlaying) {
                battleSound.stop();
            }

            drawOptions.drawUI = !menu.visible;
            drawGame(renderer, config, manager, drawOptions);
            simulateGameTick(dt, state, manager, menu, sounds, renderer.camera, eventQueue);
            processGameEvents(eventQueue, state, manager, sounds);
            state.nextTick();
            input.nextTick();
        } catch (err) {
            logger.error('Error in animationCallback %O', err);
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
    menu: Menu,
    sounds: SoundManager,
    camera: Camera,
    events: EventQueue,
) {
    const player = manager.player;

    if (state.playing && player.dead && player.healthAnimation.finished) {
        const playedRecording = state.recording.playing;
        state.markDead();
        // TODO: Menu should not be a part of simulation and should be handled outside of this function.
        if (!playedRecording) {
            menu.showDead();
            sounds.playSound(SoundType.GAME_OVER, 1);
        }
    }

    if (!player.dead && justCompletedGame(state, manager.world.activeRoom)) {
        player.completedGame = true;
        state.markCompleted();
        const timeoutMs = 5000;
        notify('Congratulation!', {timeoutMs});
        notify(`Completed in ${player.survivedFor.toHumanString()}`, {timeoutMs});
        setTimeout(() => {
            menu.showCompleted();
        }, timeoutMs);
    }

    if (state.playing || state.dead || state.debugUpdateTriggered) {
        manager.updateEffects(dt);
        manager.updateAllEntities(dt, camera, events);
    }
}

function resizeGame(renderer: Renderer, menu: Menu, world: World): void {
    renderer.resizeCanvasByWindow(window);
    renderer.camera.focusOnRect(world.activeRoom.boundary);
    menu.resize(renderer.canvas.offsetWidth, renderer.canvas.offsetHeight);
}
