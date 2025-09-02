import {computed, type Signal, signal} from '#/signals';
import {Button, ButtonProps, Slider} from '#/ui/components';
import {CSSStyleConfig, extendUIChildren, UIComponent, type UIContext} from '#/ui/core';
import {GameControlAction, type EventQueue} from '#/events';

export type MenuView = 'main' | 'pause' | 'dead' | 'completed';

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

    const menuTitle = computed(() => {
        switch (view.get()) {
            case 'main':
                return 'PanzerLock';
            case 'pause':
                return 'Paused';
            case 'dead':
                return 'Game Over';
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
                                onGameControl('resume');
                            },
                            children: 'Resume',
                        });
                    }, [view]),
                    MenuButton(ui, {
                        onClick: () => {
                            onGameControl('start');
                        },
                        children: startButtonText,
                    }),
                    ui.div({class: 'menu__version'}).children(`v${GAME_VERSION}-${COMMIT_HASH}`),
                ),
                ui
                    .div({class: 'menu__content'})
                    .children(
                        MenuSettingsBar(ui, {volume, muted, onFullscreenToggle}),
                        MenuControlsView(ui),
                    ),
            ),
        css`
            /* HACK: for some reason this is not inherited from the root */
            * {
                box-sizing: border-box;
                padding: 0;
                margin: 0;
            }
            .menu {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background-color: oklch(from var(--color-bg-dark) l c h / 0.75);
                display: flex;
                justify-content: space-between;
                align-items: center;
                color: var(--color-text);
                font-size: 24px;
            }
            .menu__sidebar {
                position: relative;
                background-color: oklch(from var(--color-bg) l c h / 0.95);
                width: 33%;
                max-width: 27rem;
                height: 100%;
                padding: 1rem;
                display: flex;
                gap: 1rem;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                border-right: 1px solid var(--color-border);
            }
            .menu__sidebar > * {
                width: 100%;
                max-width: 20rem;
            }
            .sidebar__header {
                text-align: center;
                margin-bottom: 1.25rem;
                color: var(--color-text);
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
            .menu__version {
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                text-align: center;
                font-size: 16px;
                color: var(--color-text-muted, #ff00ffbf);
                max-width: 100%;
            }
        `,
    ];
});

const MenuControlsView = UIComponent('menu-controls', (ui) => {
    const css = ui.css;
    return [
        ui
            .div({class: 'menu-controls'})
            .children(
                ui.h2().children('Controls'),
                ui
                    .ul({class: 'controls-list'})
                    .children(
                        ui
                            .li()
                            .children(
                                ui.code().children('W'),
                                ' ',
                                ui.code().children('S'),
                                ' ',
                                ui.code().children('A'),
                                ' ',
                                ui.code().children('D'),
                                ' - Move',
                            ),
                        ui.li().children(ui.code().children('Space'), ' - Shoot'),
                        ui.li().children(ui.code().children('P'), ' - Pause/Resume'),
                        ui.li().children(ui.code().children('F'), ' - Toggle Fullscreen'),
                        ui.li().children(ui.code().children('M'), ' - Toggle Music and Sounds'),
                    ),
            ),
        css`
            .menu-controls {
                background-color: oklch(from var(--color-bg) l c h / 0.95);
                border: 1px solid var(--color-border);
                border-radius: 0.3em;
                padding: 1rem;
                width: fit-content;
            }
            h2 {
                font-size: 2rem;
                font-weight: bold;
                margin: 0 0 1rem;
                text-align: center;
            }
            ul {
                margin: 0;
                padding: 0;
                list-style: none;
            }
            li {
                font-size: 1.5rem;
                padding: 1rem 0;
                text-shadow: 0 0 0.3em var(--black-raisin);
            }
            code {
                font-size: inherit;
                padding: 0.2em 0.4em;
                border-radius: 0.3em;
                background-color: oklch(from var(--color-bg-light) l c h / 0.5);
                border: 1px solid var(--color-border);
                border-top: 1px solid var(--color-highlight);
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
                name: 'volume',
                min: VOLUME_MIN,
                max: VOLUME_MAX,
                step: VOLUME_CHANGE_STEP,
                value: volume,
                style: {width: '10rem'},
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
                        background-color: var(--btn-primary-bg);
                        /*border: none;*/
                        border: 3px solid var(--btn-primary-border);
                        color: var(--btn-primary-text);
                        padding: 0.5rem 2rem;
                        font-weight: 500;
                        font-size: 2rem;
                        width: 100%;
                        text-align: center;
                        transition-property: outline, background-color;
                        transition-timing-function: ease-in-out;
                        transition-duration: 0.2s;
                        border-radius: 0.25rem;
                        cursor: pointer;
                        outline: 0 solid transparent;
                        outline-offset: 3px;
                    }
                    button:hover,
                    button:active {
                        background-color: var(--btn-primary-bg-hover);
                    }
                    button:focus-visible {
                        outline: 3px solid var(--btn-primary-border);
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
                        font-size: 1.25rem;
                        line-height: 1.5rem;
                        overflow: hidden;
                        border-radius: 0.25rem;
                        background-color: var(--btn-secondary-bg);
                        color: var(--btn-secondary-text);
                        border: none;
                        width: 2rem;
                        height: 2rem;
                        padding: 0;
                        margin: 0;
                        text-align: center;
                        transition-property: background-color, transform, outline;
                        transition-timing-function: ease-in-out;
                        transition-duration: 0.2s;
                        cursor: pointer;
                        outline: 0 solid transparent;
                        outline-offset: 3px;
                    }
                    button:hover {
                        transform: scale(1.1);
                        background-color: oklch(from var(--btn-secondary-bg-hover) l c h / 0.75);
                    }
                    button:focus-visible {
                        outline: 3px solid var(--btn-secondary-border);
                    }
                `,
            ),
        }),
    ];
});
