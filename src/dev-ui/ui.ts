import {DevPanel, FPSMonitor} from '#/dev-ui';
import {GameState} from '#/state';
import {CustomElement, ReactiveElement, css, div} from '#/html';
import {Duration} from '#/math/duration';
import {GameStorage} from '#/storage';
import {World} from '#/world';

@CustomElement('dev-ui')
export class DevUI extends ReactiveElement {
    readonly devPanel = new DevPanel({className: 'dev-panel'});
    readonly fpsMonitor = new FPSMonitor({className: 'fps-monitor'});

    protected override render(): HTMLElement {
        return div({
            className: ['dev-ui'],
            children: [this.fpsMonitor, this.devPanel],
        });
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
            }
        `;
    }

    update(dt: Duration) {
        this.fpsMonitor.update(dt);
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
export function toggleDevPanelVisibility(
    panel: DevPanel,
    cache: GameStorage,
): void {
    if (panel.visible) {
        panel.hide();
    } else {
        panel.show();
    }
    cache.set(SHOW_DEV_PANEL_KEY, panel.visible);
}

export function createDevUI(
    state: GameState,
    world: World,
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
            const enemyIndexStr = prompt('Enter enemy index to remove');
            const enemyIndex = enemyIndexStr ? parseInt(enemyIndexStr) : NaN;
            if (isNaN(enemyIndex)) {
                console.error(
                    `Invalid enemy index: ${enemyIndexStr}. Expected an integer number`,
                );
            }
            const enemyArrayIndex = world.tanks.findIndex(
                (t) => t.bot && t.index === enemyIndex,
            );
            if (enemyArrayIndex === -1) {
                console.error(`Enemy with index ${enemyIndex} not found`);
            } else {
                world.tanks.splice(enemyArrayIndex, 1);
            }
        });
    entitiesFolder
        .addButton()
        .setName('Remove all enemies')
        .onClick(() => {
            world.tanks = world.tanks.filter((t) => !t.bot);
        });
    entitiesFolder
        .addButton()
        .setName('Spawn enemy')
        .onClick(() => world.spawnEnemy());

    const worldFolder = devPanel.addFolder('World');
    worldFolder
        .addNumberInput()
        .setName('Gravity')
        .setMin(0.1)
        .setMax(100)
        .setStep(0.1)
        .bindValue(world, 'gravityCoef');
    worldFolder
        .addNumberInput()
        .setName('Friction')
        .setMin(0.1)
        .setMax(10)
        .setStep(0.1)
        .bindValue(world, 'frictionCoef');
    return devUI;
}
