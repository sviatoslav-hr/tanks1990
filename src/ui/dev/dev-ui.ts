import {EntityManager} from '#/entity/manager';
import {importRecording, toggleRecordingEnabledOrStop} from '#/recording';
import {Renderer} from '#/renderer';
import {GameState} from '#/state';
import {exportAsJson, GameStorage} from '#/storage';
import {DevPanel, FPSMonitor} from '#/ui/dev';
import {css, CustomElement, ReactiveElement, ui} from '#/ui/core';
import {notify, notifyError} from '#/ui/notification';

export function createDevUI(
    state: GameState,
    manager: EntityManager,
    renderer: Renderer,
    cache: GameStorage,
): DevUI {
    const devUI = new DevUI();
    const isFPSVisible = cache.getBool(SHOW_FPS_KEY) ?? false;
    if (!isFPSVisible) {
        devUI.fpsMonitor.hide();
    }
    const isDevPanelVisible = cache.getBool(SHOW_DEV_PANEL_KEY) ?? false;
    if (!isDevPanelVisible) {
        devUI.devPanel.hide();
    }
    const devPanel = devUI.devPanel;

    const entitiesFolder = devPanel.addFolder('Entities');
    entitiesFolder
        .addButton()
        .setName('Trigger Update')
        .onClick(() => {
            state.debugUpdateTriggered = true;
        });
    entitiesFolder
        .addButton()
        .setName('Remove enemy')
        .onClick(() => {
            const enemyId = parseInt(prompt('Enter enemy id to remove')!);
            if (isNaN(enemyId)) {
                logger.error(`Invalid enemy ID: ${enemyId}. Expected an integer number`);
            }
            const enemyArrayIndex = manager.tanks.findIndex((t) => t.bot && t.id === enemyId);
            if (enemyArrayIndex === -1) {
                logger.error(`Enemy with index ${enemyId} not found`);
            } else {
                manager.tanks.splice(enemyArrayIndex, 1);
            }
        });
    entitiesFolder
        .addButton()
        .setName('Remove all enemies')
        .onClick(() => {
            manager.tanks = manager.tanks.filter((t) => !t.bot);
        });
    entitiesFolder
        .addButton()
        .setName('Spawn enemy')
        .onClick(() => manager.spawnEnemy()); // TODO: Add a way to select enemy kind

    const rendererFolder = devPanel.addFolder('Renderer');
    rendererFolder
        .addButton()
        .setName(renderer.imageSmoothingDisabled ? 'Enable Smoothing' : 'Disable Smoothing')
        .onClick((btn) => {
            renderer.imageSmoothingDisabled = !renderer.imageSmoothingDisabled;
            btn.setName(renderer.imageSmoothingDisabled ? 'Enable Smoothing' : 'Disable Smoothing');
            notify(renderer.imageSmoothingDisabled ? 'Smoothing disabled' : 'Smoothing enabled');
        });

    const toolsFolder = devPanel.addFolder('Tools');
    toolsFolder
        .addButton()
        .setName('Open Assets')
        .onClick(() => window.open('./assets.html', '_blank'));
    toolsFolder
        .addButton()
        .setName('Toggle Recording')
        .onClick(() => toggleRecordingEnabledOrStop(state));
    toolsFolder
        .addFilePicker()
        .setPlaceholder('Import Recording')
        .setMultiple(false)
        .setContentType('.json,application/json')
        .onSelect((files) => {
            const file = files[0];
            file?.text().then((text) => importRecording(state, text));
        });
    toolsFolder
        .addButton()
        .setName('Export Recording')
        .onClick(() => {
            if (!state.recordingInfo.inputs.length) {
                notifyError('No recording to export');
                return;
            }
            const filename = `recording-${state.recordingInfo.startedAt}.json`;
            exportAsJson(state.recordingInfo, filename);
        });

    // const world = devPanel.addFolder('World');
    // TODO: Checkboxes to show/hide boundary, grid, etc.
    return devUI;
}

@CustomElement('dev-ui')
export class DevUI extends ReactiveElement {
    readonly devPanel = new DevPanel({className: 'dev-panel'});
    readonly fpsMonitor = new FPSMonitor({className: 'fps-monitor'});

    protected override render(): HTMLElement[] {
        return [ui.div({className: ['dev-ui']}, this.fpsMonitor, this.devPanel)];
    }

    protected override styles(): HTMLStyleElement {
        return css`
            .dev-ui {
                padding: 0;
                margin: 0;
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 0;
                box-sizing: border-box;
            }
            .fps-monitor {
                position: absolute;
                top: 0;
                left: 0;
            }
            .dev-panel {
                position: absolute;
                top: 0;
                right: 0;
                overflow-y: auto;
                max-height: 100vh;
            }
        `;
    }
}

const SHOW_FPS_KEY = 'show_fps';
export function toggleFPSVisibility(fps: FPSMonitor, cache: GameStorage): void {
    if (fps.visible) {
        fps.hide();
    } else {
        fps.show();
    }
    cache.set(SHOW_FPS_KEY, fps.visible);
}

const SHOW_DEV_PANEL_KEY = 'show_dev_panel';
export function toggleDevPanelVisibility(panel: DevPanel, cache: GameStorage): void {
    if (panel.visible) {
        panel.hide();
    } else {
        panel.show();
    }
    cache.set(SHOW_DEV_PANEL_KEY, panel.visible);
}
