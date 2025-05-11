import {DEV_MODE_KEY} from '#/const';
import {DevUI, toggleDevPanelVisibility, toggleFPSVisibility} from '#/dev-ui';
import {Direction} from '#/entity/core';
import {EntityManager} from '#/entity/manager';
import {GameInput} from '#/game-input';
import {Vector2Like} from '#/math/vector';
import {Menu} from '#/menu';
import {notify} from '#/notification';
import {Renderer} from '#/renderer';
import {GameState} from '#/state';
import {GameStorage} from '#/storage';

// TODO: Probably all keys handling should be here so it's centralized.
// TODO: At some point the key bindings should be separated from the specifics of the key handling.
// (e.g. Bindings code could fire events that are handled somewhere else)

export interface InputResult {
    dt?: number;
    playerDirection?: Direction;
    // PERF: It will be more efficient to compress these into flags.
    //       Although I'm not sure how well it will work in the usage code.
    playerShooting?: 1;
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
}

export function handleGameKeymaps(input: GameInput): InputResult {
    const result: InputResult = {};
    const alt = __DEV_MODE && input.isDown('AltLeft'); // NOTE: Alt is used for debug keymaps.
    const shift = input.isDown('ShiftLeft'); // NOTE: Shift is used for alternative actions.

    if (input.isPressed('KeyF')) {
        result.toggleFullscreen = 1;
    }

    if (input.isPressed('KeyP') || input.isPressed('Escape')) {
        result.toggleGamePause = 1;
    } else if (alt && input.isPressed('KeyO')) {
        result.toggleGamePauseIgnoreMenu = 1;
    }

    {
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
    }

    if (alt) {
        if (input.isPressed('BracketRight')) {
            result.triggerSingleUpdate = 1;
        }

        if (input.isPressed('KeyB')) {
            result.showBoundaries = 1;
        }

        if (input.isPressed('Semicolon')) {
            result.toggleDevMode = 1;
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

export function handleGameInputResult(
    input: InputResult,
    renderer: Renderer,
    state: GameState,
    manager: EntityManager,
    menu: Menu,
    devUI: DevUI,
    storage: GameStorage,
) {
    if (state.playing) {
        manager.player.changeDirection(input.playerDirection ?? null);
    }
    if (input.playerShooting) {
        manager.player.shoot();
    }

    if (input.toggleFullscreen) {
        renderer
            .toggleFullscreen(window)
            .catch((err) => logger.error('[Input] Failed to toggle fullscreen', err));
    }

    if (input.toggleGamePause) {
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

    if (input.toggleGamePauseIgnoreMenu) {
        if (!state.dead) {
            state.togglePauseResume();
        } else {
            logger.warn('[Input] Game is over, cannot pause/unpause');
        }
    }

    if (input.triggerSingleUpdate) {
        if (menu.visible) {
            menu.hide();
        }
        state.debugUpdateTriggered = true;
    }

    if (input.showBoundaries) {
        manager.world.showBoundary = !manager.world.showBoundary;
        manager.world.markDirty();
    }

    if (input.toggleDevMode) {
        window.__DEV_MODE = !window.__DEV_MODE;
        storage.set(DEV_MODE_KEY, window.__DEV_MODE);
        notify(`Dev mode ${window.__DEV_MODE ? 'enabled' : 'disabled'}`);
    }

    if (input.toggleFPSMonitor) {
        toggleFPSVisibility(devUI.fpsMonitor, storage);
    }
    if (input.toggleFPSMonitorPause) {
        devUI.fpsMonitor.paused = !devUI.fpsMonitor.paused;
    }

    if (input.toggleDevPanel) {
        toggleDevPanelVisibility(devUI.devPanel, storage);
    }

    if (input.cameraManualOffset) {
        renderer.camera.manualMode = true;
        const offset = input.cameraManualOffset;
        offset.x /= renderer.camera.scale;
        offset.y /= renderer.camera.scale;
        renderer.camera.worldOffset.add(offset);
    }

    if (input.cameraManualScaleOffset != null) {
        renderer.camera.manualMode = true;
        renderer.camera.setScale(renderer.camera.scale - input.cameraManualScaleOffset);
    } else if (input.cameraManualScale != null) {
        renderer.camera.manualMode = true;
        renderer.camera.setScale(renderer.camera.scale - input.cameraManualScale);
    }

    if (input.cameraReset) {
        renderer.camera.reset();
        renderer.camera.focusOnRect(manager.world.activeRoom.boundary);
    }
}
