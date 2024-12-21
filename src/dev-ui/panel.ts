import {DevButton, DevNumberInput} from '#/dev-ui';
import {
    CustomElement,
    HTMLElementOptions,
    ReactiveElement,
    css,
    div,
} from '#/html';
import {setStoredIsDevPanelVisible} from '#/storage';

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
        setStoredIsDevPanelVisible(storage, this.visible);
    }

    addFolder(name: string): DevPanel {
        const folder = new DevPanel(undefined, name);
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
}
