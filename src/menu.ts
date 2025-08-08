import {EventQueue} from '#/events';
import {SoundManager} from '#/sound';
import {CustomElement, html, ui} from '#/ui/html';

// TODO: refactor menu into ReactiveElement
// TODO: Detach SoundManager from Menu
export function initMenu(events: EventQueue, sounds: SoundManager): Menu {
    const menu = new Menu(sounds.storedMuted);
    menu.addButton(
        'NEW GAME',
        () => {
            events.push({type: 'game-control', action: 'start'});
        },
        [MenuState.START],
    );
    menu.addButton(
        'RESUME',
        () => {
            events.push({type: 'game-control', action: 'resume'});
        },
        [MenuState.PAUSE],
    );
    menu.addButton(
        'RESTART',
        () => {
            events.push({type: 'game-control', action: 'start'});
        },
        [MenuState.PAUSE, MenuState.DEAD, MenuState.COMPLETED],
    );
    menu.addButton(
        'MAIN MENU',
        () => {
            events.push({type: 'game-control', action: 'init'});
        },
        [MenuState.PAUSE, MenuState.DEAD, MenuState.COMPLETED],
    );
    const optionsPage = new MenuPage('OPTIONS', menu);
    {
        const wrapper = document.createElement('div');
        wrapper.className = 'mx-auto w-fit p-4';
        const MAX_VOLUME = 50;
        const initValue = Math.floor(sounds.volume * MAX_VOLUME);
        const slider = new Slider({
            name: 'volume',
            label: 'Volume',
            max: MAX_VOLUME,
            initValue,
        });
        slider.onChange((value) => sounds.updateVolume(value / MAX_VOLUME));
        wrapper.append(slider);
        optionsPage.setContent(wrapper);
        menu.onMuteClicked = (muted: boolean) => {
            if (muted) sounds.suspend();
            else sounds.resume();
        };
    }
    menu.addPage(optionsPage);
    menu.addButton('OPTIONS', () => {
        optionsPage.show();
        menu.hide();
    });
    const controlsPage = new MenuPage('CONTROLS', menu);
    controlsPage.setContent(html`
        <ul class="mx-auto w-fit hints">
            <li>Use <code>W</code> <code>S</code> <code>A</code> <code>D</code> to move</li>
            <li>Press <code>Space</code> to shoot</li>
            <li><code>P</code> to pause</li>
            <li><code>\`</code> to toggle FPS</li>
            <li><code>F</code> to toggle Fullscreen</li>
        </ul>
    `);
    menu.addPage(controlsPage);
    menu.addButton('CONTROLS', () => {
        controlsPage.show();
        menu.hide();
    });
    return menu;
}

export enum MenuState {
    HIDDEN = 'hidden',
    START = 'start',
    PAUSE = 'pause',
    DEAD = 'dead',
    COMPLETED = 'completed',
}

type MenuClickCallback = (button: MenuButton) => void;

const DEFAULT_MENU_STATES = [MenuState.START, MenuState.PAUSE, MenuState.DEAD, MenuState.COMPLETED];

@CustomElement('game-menu-button')
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
@CustomElement('game-menu-page')
export class MenuPage extends HTMLElement {
    private contentWrapper: HTMLDivElement;
    private container: HTMLDivElement;

    constructor(
        title: string,
        private readonly menu: Menu,
    ) {
        super();
        this.initStyles();
        this.hide();
        this.append((this.container = this.createContainer()));
        this.container.append(this.createCloseButton());
        this.container.append(this.createTitle(title));
        this.container.append((this.contentWrapper = this.createContentWrapper()));
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

    setContent(html: string | HTMLElement): void {
        if (typeof html === 'string') {
            this.contentWrapper.innerHTML = html;
        } else {
            this.contentWrapper.replaceChildren(html);
        }
    }

    private initStyles(): void {
        this.classList.add('bg-transparent-black');
        this.style.position = 'absolute';
        this.style.width = '100%';
        this.style.height = '100%';
        this.style.top = '50%';
        this.style.left = '50%';
        this.style.padding = '16px';
        this.style.transform = 'translate(-50%, -50%)';
        this.style.zIndex = '999';
    }

    private createContainer(): HTMLDivElement {
        const div = document.createElement('div');
        div.classList.add('menu');
        return div;
    }

    private createContentWrapper(): HTMLDivElement {
        return document.createElement('div');
    }

    private createTitle(text: string): HTMLElement {
        const element = document.createElement('h4');
        element.textContent = text;
        element.style.textAlign = 'center';
        element.style.fontSize = '24px';
        element.style.marginBottom = '16px';
        return element;
    }

    private createCloseButton(): HTMLButtonElement {
        const closeButton = document.createElement('button');
        closeButton.style.position = 'absolute';
        closeButton.style.top = '0';
        closeButton.style.left = '-2rem';
        closeButton.style.transform = 'translate(-100%, 0)';
        closeButton.textContent = 'Back';
        closeButton.classList.add('button');
        closeButton.onclick = () => {
            this.hide();
            this.menu.restore();
        };
        return closeButton;
    }
}

@CustomElement('game-menu')
export class Menu extends HTMLElement {
    private state?: MenuState;
    private prevState?: MenuState;
    private heading: HTMLHeadingElement;
    private mainContainer: HTMLDivElement;
    private buttonContainer: HTMLElement;
    private buttons: MenuButton[] = [];
    private pages: MenuPage[] = [];
    readonly fullscreenButton: HTMLButtonElement;
    readonly muteButton: HTMLButtonElement;
    onMuteClicked: (muted: boolean) => void = () => {};
    fullscreenToggleExpected = false;

    constructor(defaultMuted: boolean) {
        super();
        this.classList.add('block');

        this.mainContainer = document.createElement('div');
        this.append(this.mainContainer);
        this.mainContainer.classList.add('menu');

        this.heading = document.createElement('h2');
        this.mainContainer.append(this.heading);

        this.buttonContainer = document.createElement('div');
        this.buttonContainer.classList.add('flex-col', 'w-full');
        this.buttonContainer.append(...this.buttons);
        this.mainContainer.append(this.buttonContainer);

        // TODO: This is bad, this shouldn't be handled in the menu.
        {
            this.fullscreenButton = ui.button(
                {
                    className: 'button--fullscreen',
                    style: {
                        position: 'fixed',
                        top: '1rem',
                        right: '1rem',
                    },
                    onClick: (e) => {
                        e.preventDefault(); // NOTE: Prevent accidental movement of the camera
                        this.fullscreenToggleExpected = !this.fullscreenToggleExpected;
                        this.fullscreenButton.blur();
                    },
                },
                '⛶',
            );
            this.append(this.fullscreenButton);
        }

        {
            const volumeText = '🔊';
            const mutedText = '🔇';
            let muted = defaultMuted;
            this.muteButton = ui.button(
                {
                    className: 'button--fullscreen',
                    style: {
                        position: 'fixed',
                        top: '1rem',
                        right: '4rem',
                        fontSize: '1.5rem',
                    },
                    onClick: (e) => {
                        e.preventDefault();
                        muted = !muted;
                        this.muteButton.textContent = muted ? mutedText : volumeText;
                        this.onMuteClicked(muted);
                        this.muteButton.blur();
                    },
                },
                muted ? mutedText : volumeText,
            );
            this.append(this.muteButton);
        }
    }

    get isMain(): boolean {
        return this.state === MenuState.START;
    }

    get dead(): boolean {
        return this.state === MenuState.DEAD;
    }

    get visible(): boolean {
        return !!this.state && this.state !== MenuState.HIDDEN;
    }

    get paused(): boolean {
        return this.state === MenuState.PAUSE;
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

    showCompleted(): void {
        this.update(MenuState.COMPLETED);
        this.setDisabled(true);
        setTimeout(() => this.setDisabled(false), 300);
    }

    restore(): void {
        if (this.state === MenuState.HIDDEN && this.prevState) {
            this.update(this.prevState);
        }
    }

    addButton(text: string, onClick: MenuClickCallback, states?: MenuState[]): void {
        const button = new MenuButton(text, this.createButtonCallback(onClick), states);
        this.buttons.push(button);
        this.buttonContainer.append(button);
    }

    addPage(page: MenuPage): void {
        this.pages.push(page);
        this.append(page);
    }

    resize(width: number, height: number): void {
        if (!width || !height) {
            logger.error(
                `Expected width and height to be non-zero, got width=${width}, height=${height}`,
            );
            return;
        }
        this.style.width = `${width}px`;
        this.style.height = `${height}px`;
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
        if (this.state === state) {
            return;
        }
        const prevState = this.state;
        this.state = state;
        if (state === MenuState.HIDDEN) {
            this.setMainVisibility(false);
            if (prevState !== MenuState.HIDDEN) {
                this.prevState = prevState;
            }
            return;
        } else {
            this.setMainVisibility(true);
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

    private setMainVisibility(visible: boolean): void {
        if (visible) {
            this.mainContainer.hidden = false;
            this.classList.add('bg-transparent-black');
            this.classList.add('fade-in');
            this.fullscreenButton.hidden = false;
            this.muteButton.hidden = false;
        } else {
            this.mainContainer.hidden = true;
            this.classList.remove('bg-transparent-black');
            this.classList.remove('fade-in');
            this.fullscreenButton.hidden = true;
            this.muteButton.hidden = true;
        }
    }

    private createButtonCallback(callback: MenuClickCallback): MenuClickCallback {
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
                return this.setHeading('Panzerlock');
            case MenuState.PAUSE:
                return this.setHeading('Paused');
            case MenuState.DEAD:
                return this.setHeading('Game Over');
            case MenuState.COMPLETED:
                return this.setHeading('You won!');
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

@CustomElement('game-slider')
export class Slider extends HTMLElement {
    static index = 0;
    private index: number;
    private input: HTMLInputElement;

    constructor({name, label = name, min = 0, max = 50, step = 1, initValue = 0}: SliderConfig) {
        super();
        const labelElement = document.createElement('label');
        labelElement.textContent = label;
        this.index = Slider.index++;
        const id = `slider-${this.index}`;
        labelElement.htmlFor = id;
        labelElement.style.marginRight = '16px';
        this.style.display = 'flex';
        this.style.alignItems = 'center';
        this.style.justifyContent = 'center';
        this.input = document.createElement('input');
        this.input.id = id;
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
