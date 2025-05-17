import {DEV_MODE_KEY} from '#/const';
import {DevUI, toggleDevPanelVisibility, toggleFPSVisibility} from '#/dev-ui';
import {Direction} from '#/entity/core';
import {EntityManager} from '#/entity/manager';
import {GameInput} from '#/input';
import {Vector2Like} from '#/math/vector';
import {Menu} from '#/menu';
import {notify} from '#/notification';
import {
    exitRecording,
    getNextRecordedInput,
    playRecentRecording,
    toggleRecording,
} from '#/recording';
import {Renderer} from '#/renderer';
import {GameState} from '#/state';
import {GameStorage} from '#/storage';

export interface InputState {
    game: GameInputState;
    extra: ExtraInputState;
}

export interface GameInputState {
    dt?: number;
    playerDirection?: Direction;
    playerShooting?: 1;
}

export interface ExtraInputState {
    // PERF: It will be more efficient to compress these into flags.
    //       Although I'm not sure how well it will work in the usage code.
    toggleGamePause?: 1;
    toggleGamePauseIgnoreMenu?: 1;
    toggleFullscreen?: 1;
    triggerSingleUpdate?: 1;
    showBoundaries?: 1;
    toggleDevMode?: 1;
    toggleFPSMonitor?: 1;
    toggleFPSMonitorPause?: 1;
    toggleDevPanel?: 1;
    // TODO: This really needs to controlling only dev camera.
    cameraManualOffset?: Vector2Like;
    cameraManualScaleOffset?: number;
    cameraManualScale?: number;
    cameraReset?: 1;
    toggleRecording?: 1;
    playOrExitRecording?: 1;
}

export function handleKeymaps(state: GameState, input: GameInput): InputState {
    let gameInput: GameInputState | undefined;
    if (state.recording.playing) {
        gameInput = getNextRecordedInput(state) ?? {};
    } else {
        gameInput = handleGameKeymaps(input);
    }
    const extraInput = handleExtraKeymaps(input);
    return {game: gameInput, extra: extraInput};
}

export function handleGameKeymaps(input: GameInput): GameInputState {
    const result: GameInputState = {};
    if (input.isDown('Space')) {
        result.playerShooting = 1;
    }
    // NOTE: If player is pressing two opposite direction keys, they should negate each other.
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) {
        result.playerDirection = Direction.WEST;
    }
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) {
        if (result.playerDirection === Direction.WEST) {
            result.playerDirection = undefined;
        } else {
            result.playerDirection = Direction.EAST;
        }
    }
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) {
        result.playerDirection = Direction.NORTH;
    }
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) {
        if (result.playerDirection === Direction.NORTH) {
            result.playerDirection = undefined;
        } else {
            result.playerDirection = Direction.SOUTH;
        }
    }
    return result;
}

export function handleExtraKeymaps(input: GameInput): ExtraInputState {
    const result: ExtraInputState = {};
    const alt = input.isDown('AltLeft'); // NOTE: Alt is used for debug keymaps.
    const shift = input.isDown('ShiftLeft'); // NOTE: Shift is used for alternative actions.

    if (input.isPressed('KeyF')) {
        result.toggleFullscreen = 1;
    }

    if (input.isPressed('Escape')) {
        result.toggleGamePause = 1;
    } else if (input.isPressed('KeyP')) {
        if (__DEV_MODE && alt) result.toggleGamePauseIgnoreMenu = 1;
        else result.toggleGamePause = 1;
    }

    if (alt && input.isPressed('Semicolon')) {
        result.toggleDevMode = 1;
    }

    // NOTE: Dev keymaps shuld only be available in dev mode.
    if (__DEV_MODE && alt) {
        if (input.isPressed('BracketRight')) {
            result.triggerSingleUpdate = 1;
        }

        if (input.isPressed('KeyB')) {
            result.showBoundaries = 1;
        }

        if (input.isPressed('KeyO')) {
            result.toggleRecording = 1;
        }

        if (input.isPressed('KeyI')) {
            result.playOrExitRecording = 1;
        }

        if (input.isPressed('Backquote'))
            if (shift) {
                result.toggleFPSMonitorPause = 1;
            } else {
                result.toggleFPSMonitor = 1;
            }

        if (input.isPressed('Backslash')) {
            result.toggleDevPanel = 1;
        }

        if (input.isDown('MouseMiddle')) {
            result.cameraManualOffset = input.getMouseDelta();
        } else if (input.isDown('MouseLeft')) {
            // NOTE: Same as MouseMiddle but for touchpad. Nagating to make it feel like
            // dragging the camera.
            result.cameraManualOffset = input.getMouseDelta().negate();
        }

        if (input.isPressed('Digit0')) {
            result.cameraReset = 1;
        } else if (input.isPressed('Digit1')) {
            result.cameraManualScaleOffset = 1;
            result.cameraManualScale = 1;
        } else if (input.isPressed('Digit2')) {
            result.cameraManualScaleOffset = 2;
            result.cameraManualScale = 1;
        } else if (input.getMouseWheelDelta()) {
            result.cameraManualScaleOffset = input.getMouseWheelDelta() * 0.001;
        }
    }

    return result;
}

export function processInput(
    input: InputState,
    renderer: Renderer,
    state: GameState,
    manager: EntityManager,
    menu: Menu,
    devUI: DevUI,
    storage: GameStorage,
) {
    if (state.playing) {
        manager.player.changeDirection(input.game.playerDirection ?? null);
    }
    if (input.game.playerShooting) {
        manager.player.shoot();
    }

    if (input.extra.toggleFullscreen) {
        renderer
            .toggleFullscreen(window)
            .catch((err) => logger.error('[Input] Failed to toggle fullscreen', err));
    }

    if (input.extra.toggleGamePause) {
        if (state.paused && !menu.paused) {
            menu.showPause();
        } else {
            if (!state.initial && !manager.player.dead) {
                if (state.playing) {
                    menu.showPause();
                } else {
                    menu.hide();
                }
            }
            state.togglePauseResume();
        }
    }

    if (input.extra.toggleGamePauseIgnoreMenu) {
        if (state.playing || state.paused) {
            logger.info(state.playing ? 'Game paused' : 'Game resumed');
            state.togglePauseResume();
        } else {
            logger.warn('Game is not in playing state, cannot pause/unpause');
        }
    }

    if (input.extra.triggerSingleUpdate) {
        if (menu.visible) {
            menu.hide();
        }
        state.debugUpdateTriggered = true;
    }

    if (input.extra.showBoundaries) {
        manager.world.showBoundary = !manager.world.showBoundary;
        manager.world.markDirty();
    }

    if (input.extra.toggleRecording) {
        toggleRecording(state);
    }

    if (input.extra.playOrExitRecording) {
        if (!state.recording.playing) {
            playRecentRecording(state, manager, menu);
        } else {
            exitRecording(state, menu);
        }
    }

    if (input.extra.toggleDevMode) {
        window.__DEV_MODE = !window.__DEV_MODE;
        storage.set(DEV_MODE_KEY, window.__DEV_MODE);
        notify(`Dev mode ${window.__DEV_MODE ? 'enabled' : 'disabled'}`);
    }

    if (input.extra.toggleFPSMonitor) {
        toggleFPSVisibility(devUI.fpsMonitor, storage);
    }
    if (input.extra.toggleFPSMonitorPause) {
        devUI.fpsMonitor.paused = !devUI.fpsMonitor.paused;
    }

    if (input.extra.toggleDevPanel) {
        toggleDevPanelVisibility(devUI.devPanel, storage);
    }

    if (input.extra.cameraManualOffset) {
        renderer.camera.manualMode = true;
        const offset = input.extra.cameraManualOffset;
        offset.x /= renderer.camera.scale;
        offset.y /= renderer.camera.scale;
        renderer.camera.worldOffset.add(offset);
    }

    if (input.extra.cameraManualScaleOffset != null) {
        renderer.camera.manualMode = true;
        renderer.camera.setScale(renderer.camera.scale - input.extra.cameraManualScaleOffset);
    } else if (input.extra.cameraManualScale != null) {
        renderer.camera.manualMode = true;
        renderer.camera.setScale(renderer.camera.scale - input.extra.cameraManualScale);
    }

    if (input.extra.cameraReset) {
        renderer.camera.reset();
        renderer.camera.focusOnRect(manager.world.activeRoom.boundary);
    }
}
