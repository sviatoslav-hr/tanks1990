import {CustomElement, css} from '#/html';
import {numround} from '#/math';
import {Duration} from '#/math/duration';
import {
    getStoredIsDevPanelVisible,
    getStoredIsFPSVisible,
    setStoredIsFPSVisible,
} from '#/storage';
import {World} from '#/world';

interface HTMLElementOptions {
    className?: string | string[];
    textContent?: string;
    children?: HTMLElementChildren;
}

type HTMLElementChildren = string | HTMLElement | (string | HTMLElement)[];

function htmlElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    options?: HTMLElementOptions,
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName);
    applyOptionsToElement(element, options);
    return element;
}

function applyOptionsToElement(
    element: HTMLElement,
    options?: HTMLElementOptions,
) {
    if (options?.className) {
        const className = Array.isArray(options.className)
            ? options.className.join(' ')
            : options.className;
        element.className = className;
    }
    if (options?.textContent) {
        element.textContent = options.textContent;
    }
    if (options?.children) {
        const {children} = options;
        if (typeof children === 'string') {
            element.textContent = children;
        } else if (Array.isArray(children)) {
            element.append(...children);
        } else {
            element.append(children);
        }
    }
}

function div(options?: HTMLElementOptions): HTMLElement {
    const element = htmlElement('div', options);
    return element;
}

export abstract class ReactiveElement extends HTMLElement {
    readonly shadowRoot: ShadowRoot;

    constructor(options?: HTMLElementOptions) {
        super();
        this.shadowRoot = this.attachShadow({mode: 'open'});
        applyOptionsToElement(this, options);
        setTimeout(() => {
            const styles = this.styles();
            if (styles) {
                this.shadowRoot.append(styles);
            }
            const elements = this.render();
            if (Array.isArray(elements)) {
                this.shadowRoot.append(...elements);
            } else {
                this.shadowRoot.append(elements);
            }
        }, 0);
    }

    protected afterRender(): void {}

    // TODO: try avoid inheritance
    protected abstract render(): HTMLElement | HTMLElement[];
    protected abstract styles(): HTMLStyleElement | null;
}

@CustomElement('dev-panel')
export class DevPanel extends ReactiveElement {
    public visible = true;

    constructor(
        options?: HTMLElementOptions,
        readonly name?: string,
    ) {
        super(options);
    }

    protected override render(): HTMLElement {
        return div({
            className: ['dev-panel'],
            children: [
                div({textContent: 'Dev Panel: ' + (this.name ?? 'Root')}),
            ],
        });
    }

    protected override styles(): HTMLStyleElement {
        return css`
            .dev-panel {
                padding: 0.5rem;
                border: 1px solid blue;
            }
            .dev-panel:hover {
                background-color: lightblue;
                transition: background-color 0.2s;
                cursor: pointer;
            }
        `;
    }

    show(): void {
        this.visible = true;
        this.style.opacity = '1';
        this.style.pointerEvents = 'auto';
    }

    hide(): void {
        this.visible = false;
        this.style.opacity = '0';
        this.style.pointerEvents = 'none';
    }

    toggleVisibility(storage: Storage): void {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
        setStoredIsFPSVisible(storage, this.visible);
    }

    addFolder(name: string): DevPanel {
        const folder = new DevPanel(undefined, name);
        // TODO: setTimeout is a hack since shadowRoot is set in the next microtask
        setTimeout(() => {
            this.shadowRoot.append(folder);
        }, 0);
        return folder;
    }
}

@CustomElement('fps-monitor')
export class FPSMonitor extends ReactiveElement {
    private lastFPS: string = '0';
    private updateDelay = Duration.zero();
    private textElement = div({textContent: 'FPS: 60'});
    static readonly FPS_UPDATE_DELAY = new Duration(300);
    public visible = true;

    protected override render(): HTMLElement {
        // TODO: make this as a canvas
        // TODO: add fps graph (see three.js/examples/jsm/libs/stats.module.js)
        return div({
            className: ['monitor'],
            children: [this.textElement],
        });
    }

    protected override styles(): HTMLStyleElement {
        return css`
            .monitor {
                padding: 0.5rem;
                border: 1px solid red;
            }
        `;
    }

    update(dt: Duration): void {
        if (this.updateDelay.milliseconds >= 0) {
            this.updateDelay.sub(dt);
        } else {
            this.lastFPS = numround(1000 / dt.milliseconds).toString();
            this.updateDelay.setFrom(FPSMonitor.FPS_UPDATE_DELAY);
            if (this.visible) {
                this.textElement.textContent = `FPS: ${this.lastFPS}`;
            }
        }
    }

    toggleVisibility(storage: Storage): void {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
        setStoredIsFPSVisible(storage, this.visible);
    }

    show(): void {
        this.visible = true;
        this.style.opacity = '1';
        this.style.pointerEvents = 'auto';
    }

    hide(): void {
        this.visible = false;
        this.style.opacity = '0';
        this.style.pointerEvents = 'none';
    }
}

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

export function setupDevUI(_world: World, storage: Storage): DevUI {
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
    devPanel.addFolder('World');
    document.body.append(devUI);
    return devUI;
    // const gui = new GUI();
    // const worldFolder = gui.addFolder('World');
    // worldFolder.add(world, 'showBoundary');
    // worldFolder
    //     .add(world, 'gravityCoef')
    //     .name('Gravity Coeficient')
    //     .min(0.1)
    //     .max(100)
    //     .step(0.1);
    // worldFolder
    //     .add(world, 'frictionCoef')
    //     .name('Friction Coeficient')
    //     .min(0.1)
    //     .max(10)
    //     .step(0.1);
}
