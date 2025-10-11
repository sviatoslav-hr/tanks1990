import { describe, it } from 'vitest';

import { computed, signal, Signal } from '#/signals';
import { createWContext, CssStyleConfig, wComponent } from '#/ui/w';

describe('w-ui', () => {
    describe('Counter', () => {
        // TODO: Need a nice abstraction for a context, can will make testing and mocking easier
        //       Especially interested in having a way to mock user input (click, etc)
        const context = createWContext();

        const Counter = wComponent<{initial: number}>((w, props) => {
            const clickedCount = signal(props.initial);
            const handleClick = () => clickedCount.update((v) => v + 1);

            return w.div(
                {class: 'mb-4'},
                w.div(
                    {class: 'border border-green'},
                    w.span({class: 'font-bold', id: '420'}, () => `Value is ${clickedCount()}`),
                ),
                w.button(
                    {class: 'px-4 py-2 bg-blue text-white rounded', onClick: handleClick},
                    'Increment',
                ),
                w.button(
                    {class: 'px-4 py-2 bg-blue text-white rounded', onClick: handleClick},
                    'Decrement',
                ),
            );
        });

        it('should create a counter component', () => {
            Counter(context, {initial: 5});
        });
    });

    describe('Menu', () => {
        const context = createWContext();

        type MenuView = 'main' | 'pause' | 'dead' | 'completed';
        type GameControlAction = 'start' | 'pause' | 'resume' | 'game-over' | 'game-completed';

        interface MenuProps {
            view: Signal<MenuView | null>;
            volume: Signal<number>;
            muted: Signal<boolean>;
            onGameControl: (action: GameControlAction) => void;
            onFullscreenToggle: () => void;
        }

        const Menu = wComponent((w, props: MenuProps) => {
            const {volume, muted, view, onGameControl, onFullscreenToggle} = props;

            return w.div(
                {
                    class: 'menu',
                    style: computed(() => {
                        const styles: CssStyleConfig = {};
                        if (view() == null) {
                            styles.display = 'none';
                        }
                        return styles;
                    }),
                },
                w.div(
                    {class: 'menu__sidebar'},
                    w.h1({class: 'sidebar__header'}, () => {
                        switch (view()) {
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
                    }),
                    () =>
                        view() === 'pause'
                            ? MenuButton(w, {onClick: () => onGameControl('resume')}, 'Resume')
                            : null,
                    MenuButton(w, {onClick: () => onGameControl('start')}, () => {
                        switch (view()) {
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
                    }),
                    w.div({class: 'menu__version'}, `v${GAME_VERSION}-${COMMIT_HASH}`),
                ),
                w.div(
                    {class: 'menu__content'},
                    MenuSettingsBar(w, {volume, muted, onFullscreenToggle}),
                    MenuControlsView(w, {}), // TODO: empty props should optional
                ),
            );
        });

        interface MenuButtonProps {
            onClick: () => void;
        }
        const MenuButton = wComponent<MenuButtonProps, [string | (() => string | null)]>(
            (ui, props, ...children) => {
                ui;
                props;
                children;
                return [];
            },
        );

        interface MenuSettingsBarProps {
            volume: Signal<number>;
            muted: Signal<boolean>;
            onFullscreenToggle: () => void;
        }
        const MenuSettingsBar = wComponent<MenuSettingsBarProps>((ui, props) => {
            ui;
            props;
            return [];
        });

        const MenuControlsView = wComponent((ui) => {
            ui;
            return [];
        });

        it('should create a menu component', () => {
            const menu = Menu(context, {
                view: signal<MenuView | null>(null),
                volume: signal(50),
                muted: signal(false),
                onGameControl: (action) => {
                    console.log('Game control action:', action);
                },
                onFullscreenToggle: () => {
                    console.log('Fullscreen toggled');
                },
            });
        });
    });
});
