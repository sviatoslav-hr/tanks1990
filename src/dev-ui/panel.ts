import {DevButton, DevNumberInput} from '#/dev-ui';
import {
    CustomElement,
    HTMLElementOptions,
    ReactiveElement,
    css,
    div,
} from '#/html';

@CustomElement('dev-panel')
export class DevPanel extends ReactiveElement {
    public visible = true;
    private panelChildren: ReactiveElement[] = [];

    constructor(
        options?: HTMLElementOptions,
        readonly name?: string,
        readonly parentPanel?: DevPanel,
    ) {
        super(options);
    }

    protected override render(): HTMLElement {
        return div({
            className: this.parentPanel
                ? 'dev-panel'
                : ['dev-panel', 'root-panel'],
            children: [
                div({
                    textContent: this.name ?? 'Dev Panel',
                    className: ['dev-panel-trigger'],
                    onClick: () => this.toggleContainerVisibility(),
                }),
                div({
                    className: ['dev-panel-container'],
                    children: [...this.panelChildren],
                }),
            ],
        });
    }

    protected override styles(): HTMLStyleElement {
        return css`
            .dev-panel {
                background-color: #181818;
                display: flex;
                flex-direction: column;
                border-top: 1px solid blue;
            }
            .dev-panel.root-panel {
                border: 1px solid blue;
                border-right: none;
            }
            .dev-panel-trigger {
                text-align: center;
                padding: 0.5rem;
                /* border-bottom: 1px solid blue; */
                box-shadow: 0 1px 0 0 blue;
            }
            .dev-panel-trigger:hover {
                background-color: #212121;
                /* border-color: #00ffff; */
                box-shadow: 0 0 0 1px #00ffff;
                transition: background-color 0.2s;
                cursor: pointer;
            }
            .dev-panel-container {
                display: flex;
                overflow: hidden;
                gap: 12px;
                flex-direction: column;
                background-color: #181818;
                margin-top: 12px;
            }
            .dev-panel-trigger:hover + .dev-panel-container {
                opacity: 0.3;
            }
            .dev-panel-container[hidden] {
                display: none;
            }
            .dev-panel.root-panel > .dev-panel-container {
                padding: 4px;
            }
        `;
    }

    show(): void {
        this.visible = true;
        this.style.display = 'block';
    }

    hide(): void {
        this.visible = false;
        this.style.display = 'none';
    }

    addFolder(name: string): DevPanel {
        const folder = new DevPanel(undefined, name, this);
        this.append(folder);
        return folder;
    }

    addNumberInput(): DevNumberInput {
        const input = new DevNumberInput(0);
        this.append(input);
        return input;
    }

    addButton(): DevButton {
        const button = new DevButton();
        this.append(button);
        return button;
    }

    append(element: ReactiveElement): void {
        if (this.rendered) {
            this.getPanelContainer().append(element);
        }
        this.panelChildren.push(element);
    }

    private getPanelContainer(): HTMLElement {
        const container = this.shadow.querySelector<HTMLElement>(
            '.dev-panel-container',
        );
        assert(container);
        return container;
    }

    private toggleContainerVisibility(): void {
        const container = this.getPanelContainer();
        container.hidden = !container.hidden;
    }
}
