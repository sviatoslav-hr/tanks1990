import {computed, Signal, signal} from '#/signals';
import {HTMLElementOptions, UIComponent, UIContext} from '#/ui/html';

export type MenuPage = 'home' | 'settings' | 'controls' | 'pause' | 'dead' | 'completed';

interface MenuProps {
    page: Signal<MenuPage | null>;
}

export class MenuController {
    private page = signal<MenuPage | null>('home');

    get visible(): boolean {
        return this.page.get() !== null;
    }

    selectPage(page: MenuPage | null): void {
        this.page.set(page);
    }

    get props(): MenuProps {
        return {page: this.page};
    }
}

export const MenuComponent = UIComponent('menu', (ui, props: MenuProps) => {
    const {page} = props;
    const css = ui.css;
    return [
        ui.div({className: 'menu'}).children(
            ui.div({className: 'menu__sidebar'}).children(
                MenuButton(ui, {
                    onClick: () => page.set('home'),
                    text: 'Home',
                }),
                MenuButton(ui, {
                    onClick: () => page.set('controls'),
                    text: 'Controls',
                }),
                MenuButton(ui, {
                    onClick: () => page.set('settings'),
                    text: 'Settings',
                }),
                MenuButton(ui, {
                    onClick: () => page.set(null),
                    text: 'Hide Menu',
                }),
            ),
            ui.div({className: 'menu__content'}).children(
                computed(() => {
                    switch (page.get()) {
                        case 'home':
                            return 'Home!';
                        case 'controls':
                            return MenuControlsView(ui, {});
                        case 'settings':
                            return MenuSettingsView(ui, {});
                        case 'pause':
                            return 'Game is paused';
                        case 'dead':
                            return 'Game Over! You are dead';
                        case 'completed':
                            return 'Game Completed! Congratulations!';
                        case null:
                            return 'Menu is hidden';
                    }
                }, [page]),
            ),
        ),
        css`
            .menu {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background-color: var(--black-eirie-75);
                display: flex;
                justify-content: space-between;
                align-items: center;
                color: white;
                font-size: 24px;
            }
            .menu__sidebar {
                width: 200px;
                height: 100%;
                background-color: var(--red, #ff0000bf);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            .menu__content {
                flex-grow: 1;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
        `,
    ];
});

interface MenuButtonProps {
    onClick: () => void;
    text: string;
}

const MenuButton = UIComponent('menu-button', (ui, props: MenuButtonProps) => {
    const {onClick, text} = props;
    return ui.button({onClick: onClick}).children(text);
});

const MenuControlsView = UIComponent('menu-controls', (ui) => {
    const css = ui.css;
    return [
        ui
            .ul({className: 'menu-controls'})
            .children(
                ui
                    .li()
                    .children(
                        'Use ',
                        ui.code().children('W'),
                        ' ',
                        ui.code().children('S'),
                        ' ',
                        ui.code().children('A'),
                        ' ',
                        ui.code().children('D'),
                        ' to move',
                    ),
                ui.li().children('Press ', ui.code().children('Space'), ' to shoot'),
                ui.li().children(ui.code().children('P'), ' to pause'),
                ui.li().children(ui.code().children('F'), ' to toggle Fullscreen'),
            ),
        css`
            .menu-controls {
                list-style: none;
                width: fit-content;
            }
            li {
                font-size: 16px;
                padding: 4px 0;
            }
            code {
                font-size: inherit;
                padding: 0.2em 0.4em;
                border-radius: 0.3em;
                background-color: rgba(255, 255, 255, 0.15);
            }
        `,
    ];
});

const MenuSettingsView = UIComponent('menu-settings', (ui: UIContext) => {
    const css = ui.css;
    /*
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
    */
    return [
        ui.div({className: 'menu-settings'}).children(
            ui.h2().children('Settings'),
            ui.p().children('Adjust game settings below:'),
            Slider(ui, {
                className: 'volume-slider',
                name: 'volume',
                label: 'Volume',
                min: 0,
                max: 50,
                step: 1,
                initValue: 25,
            }),
            css`
                .menu-settings {
                    margin: 0 auto;
                    width: fit-content;
                    padding: 4rem;
                }
                .volume-slider {
                    display: block;
                    width: 300px;
                    margin: 1rem 0;
                }
            `,
        ),
    ];
});

interface SliderProps extends HTMLElementOptions {
    name: string;
    label?: string;
    min?: number;
    max?: number;
    step?: number;
    initValue?: number;
}

let sliderIndex = 0;
const Slider = UIComponent('slider', (ui, props: SliderProps) => {
    const {name, label = name, min = 0, max = 50, step = 1, initValue = 0} = props;
    const css = ui.css;
    const index = sliderIndex++;
    const inputId = `slider-${index}`;
    const value = signal(initValue);

    return [
        ui.div({className: 'menu-slider'}).children(
            ui.label({for: inputId}).children(label),
            ui.input({
                id: inputId,
                type: 'range',
                name: name,
                value: value.get(),
                min: min,
                max: max,
                step: step,
                onChange: (ev) => {
                    if (!ev.target) return;
                    const inputValue = (ev.target as HTMLInputElement).valueAsNumber;
                    value.set(inputValue);
                },
            }),

            ui.span({}).children(value),
        ),
        css`
            .menu-slider {
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            #${inputId} {
                flex-grow: 1;
            }
        `,
    ];
});
