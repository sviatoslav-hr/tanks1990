import {computed, type Signal, signal} from '#/signals';
import {Button, ButtonProps, Slider} from '#/ui/components';
import {CSSStyleConfig, extendUIChildren, UIComponent, type UIContext} from '#/ui/core';
import {GameControlAction, type EventQueue} from '#/events';

export type MenuView = 'main' | 'pause' | 'dead' | 'completed';
type MenuPage = 'controls';

const VOLUME_MIN = 0;
const VOLUME_MAX = 50;
const VOLUME_DEFAULT = 25;
const VOLUME_CHANGE_STEP = 1;

export class MenuBridge {
    view = signal<MenuView | null>('main');
    volume = signal(VOLUME_DEFAULT);
    muted = signal(false);
    fullscreenToggleExpected = false;

    private events: EventQueue;

    constructor(events: EventQueue) {
        this.events = events;
    }

    get visible(): boolean {
        return this.view.get() !== null;
    }

    props(): MenuProps {
        const onGameControl = (action: GameControlAction) => {
            this.events.push({type: 'game-control', action});
        };
        const onFullscreenToggle = () => {
            this.fullscreenToggleExpected = true;
        };
        return {
            view: this.view,
            volume: this.volume,
            muted: this.muted,
            onGameControl,
            onFullscreenToggle,
        };
    }
}

interface MenuProps {
    view: Signal<MenuView | null>;
    volume: Signal<number>;
    muted: Signal<boolean>;
    onGameControl: (action: GameControlAction) => void;
    onFullscreenToggle: () => void;
}

export const Menu = UIComponent('menu', (ui, props: MenuProps) => {
    const {volume, muted, view, onGameControl, onFullscreenToggle} = props;
    const css = ui.css;
    const page = signal<MenuPage | null>(null);

    const menuTitle = computed(() => {
        switch (view.get()) {
            case 'main':
                return 'PanzerLock';
            case 'pause':
                return 'Paused';
            case 'dead':
                return 'You Died';
            case 'completed':
                return 'Game Completed';
            default:
                return null;
        }
    }, [view]);
    const startButtonText = computed(() => {
        switch (view.get()) {
            case 'main':
                return 'Start';
            case 'pause':
            case 'dead':
                return 'Restart';
            case 'completed':
                return 'Play Again';
            case null:
                return null;
        }
    }, [view]);

    return [
        ui
            .div({
                class: 'menu',
                style: computed(() => {
                    const styles: CSSStyleConfig = {};
                    if (view.get() == null) {
                        styles.display = 'none';
                    }
                    return styles;
                }, [view]),
            })
            .children(
                ui.div({class: 'menu__sidebar'}).children(
                    ui.h1({class: 'sidebar__header'}).children(menuTitle),
                    computed(() => {
                        if (view.get() !== 'pause') return null;
                        return MenuButton(ui, {
                            onClick: () => {
                                page.set(null);
                                onGameControl('resume');
                            },
                            children: 'Resume',
                        });
                    }, [view]),
                    MenuButton(ui, {
                        onClick: () => {
                            page.set(null);
                            onGameControl('start');
                        },
                        children: startButtonText,
                    }),
                    MenuButton(ui, {
                        onClick: () => page.set('controls'),
                        children: 'Controls',
                    }),
                    computed(() => {
                        switch (page.get()) {
                            case null:
                                return null;
                            case 'controls':
                                return MenuButton(ui, {
                                    onClick: () => page.set(null),
                                    children: 'Go Back',
                                });
                        }
                    }, [page]),
                ),
                ui.div({class: 'menu__content'}).children(
                    computed(() => {
                        switch (page.get()) {
                            case 'controls':
                                return MenuControlsView(ui);
                            case null:
                                return MenuSettingsBar(ui, {volume, muted, onFullscreenToggle});
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
                background-color: var(--gray-granite-25, #ff00ffbf);
                width: 33%;
                height: 100%;
                padding: 1rem;
                display: flex;
                gap: 1rem;
                flex-direction: column;
                align-items: stretch;
                justify-content: center;
            }
            .sidebar__header {
                text-align: center;
            }
            .menu__content {
                flex-grow: 1;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                position: relative;
            }
        `,
    ];
});

const MenuControlsView = UIComponent('menu-controls', (ui) => {
    const css = ui.css;
    return [
        ui
            .ul({class: 'menu-controls'})
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
                font-size: 2rem;
                padding: 1rem 0;
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
    muted: Signal<boolean>;
    onFullscreenToggle: () => void;
}

const MenuSettingsBar = UIComponent('menu-settings', (ui: UIContext, props: MenuSettingsProps) => {
    const css = ui.css;
    const {volume: volumeInput, muted, onFullscreenToggle} = props;
    const volume = signal(Math.round(volumeInput.get() * VOLUME_MAX));
    volume.subscribe((value) => volumeInput.set(value / VOLUME_MAX));

    return [
        ui.div({class: 'settings'}).children(
            Slider(ui, {
                class: 'volume-slider',
                name: 'volume',
                min: VOLUME_MIN,
                max: VOLUME_MAX,
                step: VOLUME_CHANGE_STEP,
                value: volume,
            }),
            IconButton(ui, {
                children: computed(() => (muted.get() ? '🔇' : '🔊'), [muted]),
                onClick: () => muted.update((m) => !m),
            }),
            IconButton(ui, {
                style: {fontSize: '2rem'},
                children: '⛶',
                onClick: () => onFullscreenToggle(),
            }),
        ),
        css`
            .settings {
                position: absolute;
                right: 2rem;
                top: 2rem;
                display: flex;
                gap: 1rem;
                align-items: center;
            }
            .settings > * {
                line-height: 0;
            }
        `,
    ];
});

const MenuButton = UIComponent('menu-button', (ui, props: ButtonProps) => {
    const css = ui.css;
    return [
        Button(ui, {
            ...props,
            children: extendUIChildren(
                props.children,
                css`
                    button {
                        background-color: var(--gray-granite-25);
                        border: 1px var(--gray-granite) solid;
                        padding: 0.5rem 2rem;
                        font-weight: 500;
                        font-size: 2rem;
                        width: 100%;
                        text-align: left;
                        transition-property: box-shadow, background-color;
                        transition-timing-function: ease-in-out;
                        transition-duration: 0.2s;
                        border-radius: 0.125rem;
                    }
                    button:hover {
                        background-color: var(--gray-granite-75);
                    }
                    button:focus-within {
                        outline: none;
                        box-shadow: 0 0 10px 1px var(--white);
                    }
                `,
            ),
        }),
        css`
            * {
                width: 100%;
            }
        `,
    ];
});

export const IconButton = UIComponent('mute-button', (ui, props: ButtonProps) => {
    const css = ui.css;
    return [
        Button(ui, {
            ...props,
            children: extendUIChildren(
                props.children,
                css`
                    button {
                        display: inline-block;
                        font-size: 1.5rem;
                        line-height: 1.5rem;
                        overflow: hidden;
                        border-radius: 0.25rem;
                        background-color: var(--gray-granite-50);
                        width: 2rem;
                        height: 2rem;
                        padding: 0;
                        margin: 0;
                        text-align: center;
                        transition-property: box-shadow, background-color, transform;
                        transition-timing-function: ease-in-out;
                        transition-duration: 0.2s;
                        border: none;
                        outline: none;
                    }
                    button:hover {
                        transform: scale(1.1);
                        background-color: var(--gray-granite-75);
                    }
                `,
            ),
        }),
    ];
});
