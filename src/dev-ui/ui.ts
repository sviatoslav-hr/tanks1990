import {DevPanel, FPSMonitor} from '#/dev-ui';
import {CustomElement, ReactiveElement, css, div} from '#/html';
import {Duration} from '#/math/duration';
import {getStoredIsDevPanelVisible, getStoredIsFPSVisible} from '#/storage';
import {World} from '#/world';

@CustomElement('dev-ui')
export class DevUI extends ReactiveElement {
    readonly devPanel = new DevPanel();
    readonly fpsMonitor = new FPSMonitor();

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
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                align-items: flex-start;
            }
        `;
    }

    update(dt: Duration) {
        this.fpsMonitor.update(dt);
    }
}

export function createDevUI(world: World, storage: Storage): DevUI {
    const devUI = new DevUI();
    const isFPSVisible = getStoredIsFPSVisible(storage);
    if (!isFPSVisible) {
        devUI.fpsMonitor.hide();
    }
    const isDevPanelVisible = getStoredIsDevPanelVisible(storage);
    if (!isDevPanelVisible) {
        devUI.devPanel.hide();
    }
    const devPanel = devUI.devPanel;
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
