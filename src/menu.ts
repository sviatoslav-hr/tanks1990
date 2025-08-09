import {computed, type Signal, signal} from '#/signals';
import {Button, Slider} from '#/ui/components';
import {UIComponent, type UIContext} from '#/ui/core';
import {type EventQueue} from '#/events';

export type MenuView = 'main' | 'pause' | 'dead' | 'completed';
type MenuPage = 'settings' | 'controls';

const VOLUME_MIN = 0;
const VOLUME_MAX = 50;
const VOLUME_DEFAULT = 25;
const VOLUME_CHANGE_STEP = 1;

export class MenuBridge {
    view = signal<MenuView | null>('main');
    volume = signal(VOLUME_DEFAULT);

    private events: EventQueue;

    constructor(events: EventQueue) {
        this.events = events;
    }

    get visible(): boolean {
        return this.view.get() !== null;
    }

    get props(): MenuProps {
        const onPlay = () => {
            switch (this.view.get()) {
                case 'main':
                    this.view.set(null);
                    this.events.push({type: 'game-control', action: 'start'});
                    break;
                case 'pause':
                    this.view.set(null);
                    this.events.push({type: 'game-control', action: 'resume'});
                    break;
                case 'dead':
                    this.view.set(null);
                    this.events.push({type: 'game-control', action: 'start'});
                    break;
                case 'completed':
                    this.view.set(null);
                    this.events.push({type: 'game-control', action: 'start'});
                    break;
                case null:
                    assert(false, 'MenuBridge.onPlay called when view is null');
            }
        };
        return {view: this.view, volume: this.volume, onPlay};
    }
}

interface MenuProps {
    view: Signal<MenuView | null>;
    volume: Signal<number>;
    onPlay: () => void;
}

export const Menu = UIComponent('menu', (ui, props: MenuProps) => {
    const {volume, view, onPlay} = props;
    const css = ui.css;
    const page = signal<MenuPage | null>(null);
    return [
        ui
            .div({
                class: 'menu',
                style: computed(() => {
                    if (view.get() == null) {
                        return {display: 'none'};
                    }
                    return {};
                }, [view]),
            })
            .children([
                ui.div({class: 'menu__sidebar'}).children([
                    ui.h1().children(
                        computed(() => {
                            switch (view.get()) {
                                case 'main':
                                    return 'Main Menu';
                                case 'pause':
                                    return 'Paused';
                                case 'dead':
                                    return 'You Died';
                                case 'completed':
                                    return 'Game Completed';
                                default:
                                    return null;
                            }
                        }, [view]),
                    ),
                    Button(ui, {
                        onClick: () => onPlay(),
                        children: computed(() => {
                            switch (view.get()) {
                                case 'main':
                                    return 'Start';
                                case null:
                                case 'pause':
                                    return 'Resume';
                                case 'dead':
                                    return 'Restart';
                                case 'completed':
                                    return 'Play Again';
                            }
                        }, [view]),
                    }),
                    Button(ui, {
                        onClick: () => page.set('controls'),
                        children: 'Controls',
                    }),
                    Button(ui, {
                        onClick: () => page.set('settings'),
                        children: 'Settings',
                    }),
                    computed(() => {
                        switch (page.get()) {
                            case null:
                                return null;
                            case 'controls':
                            case 'settings':
                                return Button(ui, {
                                    onClick: () => page.set(null),
                                    children: 'Go Back',
                                });
                        }
                    }, [page]),
                ]),
                ui.div({class: 'menu__content'}).children(
                    computed(() => {
                        switch (page.get()) {
                            case 'controls':
                                return MenuControlsView(ui);
                            case 'settings':
                                return MenuSettingsView(ui, {volume});
                            case null:
                                return null;
                        }
                    }, [page]),
                ),
            ]),
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
                width: 33%;
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

const MenuControlsView = UIComponent('menu-controls', (ui) => {
    const css = ui.css;
    return [
        ui
            .ul({class: 'menu-controls'})
            .children([
                ui
                    .li()
                    .children([
                        'Use ',
                        ui.code().children('W'),
                        ' ',
                        ui.code().children('S'),
                        ' ',
                        ui.code().children('A'),
                        ' ',
                        ui.code().children('D'),
                        ' to move',
                    ]),
                ui.li().children(['Press ', ui.code().children('Space'), ' to shoot']),
                ui.li().children([ui.code().children('P'), ' to pause']),
                ui.li().children([ui.code().children('F'), ' to toggle Fullscreen']),
            ]),
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

interface MenuSettingsProps {
    volume: Signal<number>;
}

const MenuSettingsView = UIComponent('menu-settings', (ui: UIContext, props: MenuSettingsProps) => {
    const {volume: volumeInput} = props;
    const volume = signal(volumeInput.get() * VOLUME_MAX);
    volume.subscribe((value) => volumeInput.set(value / VOLUME_MAX));

    const css = ui.css;
    return [
        ui.div({class: 'menu-settings'}).children([
            ui.h2().children('Settings'),
            ui.p().children('Adjust game settings below:'),
            Slider(ui, {
                class: 'volume-slider',
                name: 'volume',
                label: 'Volume',
                min: VOLUME_MIN,
                max: VOLUME_MAX,
                step: VOLUME_CHANGE_STEP,
                value: volume,
            }),
        ]),
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
    ];
});
