import { Game } from './game';
import { html } from './html';
import { getVolume, setVolume } from './sound';

enum MenuState {
    HIDDEN = 'hidden',
    START = 'start',
    PAUSE = 'pause',
    DEAD = 'dead',
}

type MenuClickCallback = (button: MenuButton) => void;

const DEFAULT_MENU_STATES = [MenuState.START, MenuState.PAUSE, MenuState.DEAD];

class MenuButton extends HTMLElement {
    private buttonEl: HTMLButtonElement;
    constructor(
        text: string,
        onClick: MenuClickCallback,
        public states: MenuState[] = DEFAULT_MENU_STATES,
    ) {
        super();
        this.buttonEl = document.createElement('button');
        this.append(this.buttonEl);
        this.buttonEl.append(text);
        this.buttonEl.classList.add('button');
        this.buttonEl.tabIndex = 1;
        this.buttonEl.addEventListener('click', () => onClick(this));
    }

    focus(options?: FocusOptions): void {
        this.buttonEl.focus(options);
    }

    blur(): void {
        this.buttonEl.blur();
    }

    setDisabled(disabled: boolean): void {
        this.buttonEl.disabled = disabled;
    }
}

// TODO: update width on window resize
export class MenuPage extends HTMLElement {
    private contentWrapper: HTMLDivElement;

    constructor(
        title: string,
        private readonly menu: Menu,
    ) {
        super();
        this.initStyles();
        this.hide();
        this.append(this.createCloseButton());
        this.append(this.createTitle(title));
        this.append((this.contentWrapper = this.createContentWrapper()));
    }

    get visible(): boolean {
        return this.style.display !== 'none';
    }

    show(): void {
        this.style.display = 'block';
    }

    hide(): void {
        this.style.display = 'none';
    }

    resize(width: number, height: number): void {
        this.style.width = `${width}px`;
        this.style.height = `${height}px`;
    }

    setContent(html: string | HTMLElement): void {
        if (typeof html === 'string') {
            this.contentWrapper.innerHTML = html;
        } else {
            this.contentWrapper.replaceChildren(html);
        }
    }

    private initStyles(): void {
        this.classList.add('bg-black-ierie');
        this.style.opacity = '0.95';
        this.style.position = 'absolute';
        this.style.width = '100%';
        this.style.height = '100%';
        this.style.top = '50%';
        this.style.left = '50%';
        this.style.padding = '16px';
        this.style.transform = 'translate(-50%, -50%)';
        this.style.zIndex = '999';
    }

    private createContentWrapper(): HTMLDivElement {
        return document.createElement('div');
    }

    private createTitle(text: string): HTMLElement {
        const element = document.createElement('h4');
        element.textContent = text;
        element.classList.add('bg-black-ierie');
        element.style.textAlign = 'center';
        element.style.fontSize = '24px';
        return element;
    }

    private createCloseButton(): HTMLButtonElement {
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Back';
        closeButton.classList.add('button');
        closeButton.onclick = () => {
            this.hide();
            this.menu.restore();
        };
        return closeButton;
    }
}

// TODO: move it below
export function initMenu(menu: Menu, game: Game): void {
    menu.addButton(
        'New Game',
        () => {
            game.start();
            menu.hide();
        },
        [MenuState.START],
    );
    menu.addButton(
        'Infinite Game',
        () => {
            game.start(true);
            menu.hide();
        },
        [MenuState.START],
    );
    menu.addButton(
        'Resume',
        () => {
            game.resume();
            menu.hide();
        },
        [MenuState.PAUSE],
    );
    menu.addButton(
        'Restart',
        () => {
            game.start();
            menu.hide();
        },
        [MenuState.DEAD],
    );
    menu.addButton(
        'Main menu',
        () => {
            game.init();
            menu.showMain();
        },
        [MenuState.PAUSE, MenuState.DEAD],
    );
    const optionsPage = new MenuPage('Options', menu);
    {
        const wrapper = document.createElement('div');
        wrapper.className = 'mx-auto w-fit p-4';
        const MAX_VOLUME = 50;
        const initValue = Math.floor(getVolume() * MAX_VOLUME);
        const slider = new Slider({
            name: 'volume',
            label: 'Volume',
            max: MAX_VOLUME,
            initValue,
        });
        slider.onChange((value) => setVolume(value / MAX_VOLUME));
        wrapper.append(slider);
        optionsPage.setContent(wrapper);
    }
    menu.addPage(optionsPage);
    menu.addButton('Options', () => {
        optionsPage.resize(game.screen.width, game.screen.height);
        optionsPage.show();
        menu.hide();
    });
    const controlsPage = new MenuPage('Controls', menu);
    controlsPage.setContent(html`
        <ul class="mx-auto w-fit hints">
            <li>
                Use <code>W</code> <code>S</code> <code>A</code>
                <code>D</code> to move
            </li>
            <li>Press <code>Space</code> to shoot</li>
            <li><code>Esc</code> to pause</li>
            <li><code>\`</code> to toggle FPS</li>
            <li><code>B</code> to display boundaries</li>
            <li><code>F</code> to toggle Fullscreen</li>
        </ul>
    `);
    menu.addPage(controlsPage);
    menu.addButton('Controls', () => {
        controlsPage.resize(game.screen.width, game.screen.height);
        controlsPage.show();
        menu.hide();
    });
}

export class Menu extends HTMLElement {
    private state: MenuState = MenuState.START;
    private prevState?: MenuState;
    private heading: HTMLHeadingElement;
    private buttonContainer: HTMLElement;
    private buttons: MenuButton[] = [];
    private pages: MenuPage[] = [];

    constructor() {
        super();
        this.classList.add('menu');
        this.heading = document.createElement('h2');
        this.append(this.heading);
        this.buttonContainer = document.createElement('div');
        this.buttonContainer.classList.add('flex-col');
        this.append(this.buttonContainer);
        this.buttonContainer.append(...this.buttons);
    }

    get dead(): boolean {
        return this.state === MenuState.DEAD;
    }

    showMain(): void {
        this.update(MenuState.START);
    }

    hide(): void {
        this.update(MenuState.HIDDEN);
    }

    showPause(): void {
        this.update(MenuState.PAUSE);
    }

    showDead(): void {
        this.update(MenuState.DEAD);
        this.setDisabled(true);
        setTimeout(() => this.setDisabled(false), 300);
    }

    restore(): void {
        if (this.state === MenuState.HIDDEN && this.prevState) {
            this.update(this.prevState);
        }
    }

    addButton(
        text: string,
        onClick: MenuClickCallback,
        states?: MenuState[],
    ): void {
        const button = new MenuButton(
            text,
            this.createButtonCallback(onClick),
            states,
        );
        this.buttons.push(button);
        this.buttonContainer.append(button);
    }

    addPage(page: MenuPage): void {
        // TODO: cut out dependency on this element out of menu
        const appContainer = document.getElementById('app');
        if (!appContainer) {
            console.error('Expected app container to exist');
            return;
        }
        this.pages.push(page);
        appContainer.append(page);
    }

    private setDisabled(disabled: boolean): void {
        let focused = false;
        for (const btn of this.buttons) {
            btn.setDisabled(disabled);
            if (!disabled && !focused && !btn.hidden) {
                btn.focus();
                focused = true;
            }
        }
    }

    private update(state: MenuState): void {
        const prevState = this.state;
        this.state = state;
        if (state === MenuState.HIDDEN) {
            this.hidden = true;
            if (prevState !== MenuState.HIDDEN) {
                this.prevState = prevState;
            }
            return;
        } else {
            this.hidden = false;
        }
        this.setHeadingByState(state);
        let focused = false;
        for (const button of this.buttons) {
            button.hidden = !button.states.includes(state);
            if (!focused && !button.hidden) {
                focused = true;
                button.focus();
            }
        }
    }

    private createButtonCallback(
        callback: MenuClickCallback,
    ): MenuClickCallback {
        return (button) => {
            if (this.state === MenuState.HIDDEN) {
                button.blur();
                this.hide();
            }
            callback(button);
        };
    }

    private setHeadingByState(state: MenuState): void {
        if (state === MenuState.DEAD) {
            this.heading.classList.add('text-red');
        } else {
            this.heading.classList.remove('text-red');
        }
        switch (state) {
            case MenuState.HIDDEN:
                return;
            case MenuState.START:
                return this.setHeading('Tanks 1990');
            case MenuState.PAUSE:
                return this.setHeading('Paused');
            case MenuState.DEAD:
                return this.setHeading('You are dead');
        }
    }

    private setHeading(text: string): void {
        this.heading.textContent = text;
    }
}

interface SliderConfig {
    name: string;
    label?: string;
    min?: number;
    max?: number;
    step?: number;
    initValue?: number;
}

class Slider extends HTMLElement {
    private input: HTMLInputElement;

    constructor({
        name,
        label = name,
        min = 0,
        max = 50,
        step = 1,
        initValue = 0,
    }: SliderConfig) {
        super();
        const labelElement = document.createElement('label');
        labelElement.textContent = label;
        labelElement.htmlFor = name;
        labelElement.style.marginRight = '16px';
        this.style.display = 'flex';
        this.style.alignItems = 'center';
        this.style.justifyContent = 'center';
        this.input = document.createElement('input');
        this.input.type = 'range';
        this.input.name = name;
        this.input.min = min.toString();
        this.input.max = max.toString();
        this.input.step = step.toString();
        this.input.value = initValue.toString();
        this.append(labelElement, this.input);
    }

    onChange(callback: ((value: number) => void) | null): void {
        this.input.addEventListener('change', (ev) => {
            if (ev.target === this.input) {
                callback?.((ev.target as HTMLInputElement).valueAsNumber);
            }
        });
    }
}

customElements.define('game-menu', Menu);
customElements.define('game-menu-button', MenuButton);
customElements.define('game-menu-page', MenuPage);
customElements.define('game-slider', Slider);
