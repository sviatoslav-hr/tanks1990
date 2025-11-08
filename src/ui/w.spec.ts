import {beforeEach, describe, expect, it, vi} from 'vitest';

import {computed, effect, ReadableSignal, Signal, signal} from '#/signals';
import {
    createWContext,
    mountWComponent,
    WChildrenInput,
    wComponent,
    WContext,
    WCssStyleConfig,
    WDomChildNode,
    WDomElement,
    WDomNode,
    WDomStyles,
    WElementBasicAttributes,
    WRawChild,
} from '#/ui/w';

interface WContextMock {
    ctx: WContext;
}

// TODO: Need a nice abstraction for a context, can will make testing and mocking easier
//       Especially interested in having a way to mock user input (click, etc)
function createMockWContext(): WContextMock {
    const ctx = createWContext({
        createText: (text) => new MockTextNode(text),
        createElement: (tagName) => new MockElement(tagName),
        createAnchor: (text) => new MockCommentNode(text),
    });
    return {ctx};
}

describe('w-ui', () => {
    let mock!: WContextMock;
    const document = Object.assign(new MockElement('document'), {
        body: new MockElement('body'),
    });
    document.append(document.body);

    beforeEach(() => {
        mock = createMockWContext();
        document.body.clearChildren();
    });

    describe('Counter', () => {
        it('should render counter component', () => {
            const counter = Counter({initial: 5});
            mountWComponent(mock.ctx, counter, document.body);

            expect(document.body.children.length).toBe(2);

            const divs = findAllElements(document, (el) => el.tagName === 'div');
            expect(divs.length).toBe(2);

            const textSpan = findElement(document, (el) => el.id === '420');
            {
                expect(textSpan).not.toBeNull();
                expect(textSpan?.children.length).toBe(1);
                expect(textSpan?.children[0] instanceof MockTextNode).toBe(true);
                const textNode = textSpan?.children[0] as MockTextNode;
                expect(textNode.data).toBe('Value is 5');
            }

            const buttons = findAllElements(document, (el) => el.tagName === 'button');
            expect(buttons.length).toBe(2);

            for (const [index, button] of buttons.entries()) {
                // prettier-ignore
                expect(button.listeners['click'], `Button ${index} must have listener`).toHaveLength(1);
            }
            {
                const getResultText = () => {
                    const text = textSpan?.children[0];
                    assert(text instanceof MockTextNode, 'textSpan child should be a MockTextNode');
                    return text.data;
                };
                buttons[0]?.triggerEvent('click');
                expect(getResultText()).toBe('Value is 6');
                buttons[0]?.triggerEvent('click');
                buttons[0]?.triggerEvent('click');
                expect(getResultText()).toBe('Value is 8');
                buttons[1]?.triggerEvent('click');
                buttons[1]?.triggerEvent('click');
                buttons[1]?.triggerEvent('click');
                buttons[1]?.triggerEvent('click');
                expect(getResultText()).toBe('Value is 4');
            }
        });
    });

    describe('Menu', () => {
        it('should create a menu component', () => {
            let prevAction: GameControlAction | undefined = undefined;
            const props: MenuProps = {
                view: signal<MenuView | null>(null),
                volume: signal(50),
                muted: signal(false),
                onGameControl: (action) => {
                    prevAction = action;
                    props.view.set(action === 'resume' ? null : 'main');
                },
                onFullscreenToggle: () => {
                    console.log('Fullscreen toggled');
                },
            };
            const menu = Menu(props);

            expect(menu.type).toBe('component');
            mountWComponent(mock.ctx, menu, document.body);

            const header = findElement(document, (el) => el.className === 'sidebar__header');
            expect(header?.tagName).toBe('h1');
            expect(header?.children.length).toBe(0);

            props.view.set('main');
            expect(header?.children.length).toBe(1);

            props.view.set('pause');
            expect(header?.children.length).toBe(1);
            {
                const resumeButton = findElement(document, (el) => el.tagName === 'button');
                expect(resumeButton).toBeDefined();
                expect(resumeButton?.children[0]?.textContent).toBe('Resume');
                resumeButton?.triggerEvent('click');
                expect(prevAction).toBe('resume');
                expect(header?.children.length).toBe(0);
            }
        });
    });

    describe('NotificationBar', () => {
        it('should create a notification bar component', async () => {
            const filterHiddenNotifications = vi.fn(() => {
                notifications.update((current) => current.filter((n) => !n.hidden));
            });

            function appendNotification(options: NotificationOptions): void {
                const notification = {...options, hidden: false, createdAt: Date.now()};
                notifications.update((current) => [...current, notification]);
            }
            function getBarItems(): MockElement[] {
                return findAllElements(document, (el) =>
                    el.className.includes('notification-item'),
                );
            }

            const notifications = signal<Notification[]>([]);
            const bar = NotificationBar({
                notifications,
                onFinished: filterHiddenNotifications,
                fadeOutDurationMs: 5,
            });
            mountWComponent(mock.ctx, bar, document.body);

            const barElement = findElement(document, (el) => el?.className === 'notification-bar');
            expect(barElement).toBeDefined();
            let barItems = getBarItems();
            expect(barItems.length).toBe(0);

            appendNotification({message: 'Info message', kind: 'info', timeoutMs: 10});

            barItems = getBarItems();
            expect(barItems.length).toBe(1);
            const item = barItems[0];
            {
                const textElement = item?.children[0];
                assert(textElement instanceof MockElement, 'textElement should be a MockElement');
                expect(textElement?.children[0]?.textContent).toBe('Info message');
                expect(item?.className).toBe('notification-item notification-item--info');
            }
            {
                const removeSpy = vi.spyOn(item!, 'remove');
                await new Promise((r) => setTimeout(r, 30));
                expect(filterHiddenNotifications).toHaveBeenCalledTimes(1);
                expect(removeSpy).toHaveBeenCalledTimes(1);
                barItems = getBarItems();
                expect(notifications().length).toBe(0);
                expect(barItems.length).toBe(0);
            }
        });
    });
});

class MockNode implements WDomChildNode {
    parentElement: WDomElement | null = null;
    textContent: string | null = null;

    before(...nodes: (WDomNode | string)[]): void {
        assert(nodes.length > 0, 'at least one node should be provided');
        if (!this.parentElement) {
            // NOTE: Is DOM API this method does not error, but for our mock we will
            //       to make sure tests catch this case.
            throw new Error('Cannot insert before a node with no parent');
        }
        // prettier-ignore
        assert(this.parentElement instanceof MockElement, 'parentNode should be a MockElementNode');
        for (const node of nodes) {
            if (typeof node === 'string') {
                throw new Error('MockNode.before does not support string nodes');
            }
            this.parentElement.beforeChild(node, this);
        }
    }
    remove(): void {
        if (!this.parentElement) {
            // NOTE: Is DOM API this method does not error, but for our mock we will
            //       to make sure tests catch this case.
            throw new Error('Cannot insert before a node with no parent');
        }
        // prettier-ignore
        assert(this.parentElement instanceof MockElement, 'parentNode should be a MockElementNode');
        this.parentElement.removeChild(this);
    }
}

class MockTextNode extends MockNode {
    data: string;
    constructor(data: string) {
        super();
        this.data = data;
        this.textContent = data;
    }
}

class MockCommentNode extends MockNode {
    data: string;
    constructor(data: string) {
        super();
        this.data = data;
        this.textContent = data;
    }
}

class MockElement extends MockNode implements WDomElement {
    tagName: string;

    id: string = '';
    title: string = '';
    className: string = '';
    style: WDomStyles = new MockStyles();
    listeners: Record<string, EventListener[]> = {};

    constructor(tagName: string) {
        super();
        this.tagName = tagName;
    }

    children: WDomNode[] = [];

    append(...nodes: (WDomNode | string)[]): void {
        for (const node of nodes) {
            if (typeof node === 'string') {
                throw new Error('MockElementNode.append does not support string nodes');
            }
            this.children.push(node);
            assert(node instanceof MockNode, 'node should be a MockNode');
            node.parentElement = this;
        }
    }

    addEventListener(event: string, listener: EventListener): void {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
    }

    removeEventListener(event: string, listener: EventListener): void {
        const listeners = this.listeners[event];
        const index = listeners?.indexOf(listener);
        if (index != null && index > -1) {
            listeners?.splice(index, 1);
        }
    }

    beforeChild(newChild: WDomNode, referenceChild: WDomNode | null): void {
        const refIndex = referenceChild ? this.children.indexOf(referenceChild) : -1;
        this.children.splice(refIndex >= 0 ? refIndex : this.children.length, 0, newChild);
        assert(newChild instanceof MockNode, 'newChild should be a MockNode');
        newChild.parentElement = this;
    }

    removeChild(child: WDomNode): void {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
            assert(child instanceof MockNode, 'child should be a MockNode');
            child.parentElement = null;
        } else {
            logger.warn('Child to remove not found in MockElementNode');
        }
    }

    clearChildren(): void {
        for (const child of this.children) {
            assert(child instanceof MockNode, 'child should be a MockNode');
            child.parentElement = null;
        }
        this.children = [];
    }

    toTagString(): string {
        let str = `<${this.tagName}`;
        if (this.id) str += ` id="${this.id}"`;
        if (this.className) str += ` class="${this.className}"`;
        str += '>';
        return str;
    }

    triggerEvent(event: string): void {
        if (!this.listeners[event]?.length) return;
        for (const listener of this.listeners[event]) {
            listener(new Event(event));
        }
    }
}

class MockStyles implements WDomStyles {
    map: Record<string, string> = {};

    setProperty(property: string, value: string | null): void {
        this.map[property] = value ?? '';
    }
}

function findAllElements(root: MockElement, matches: (e: MockElement) => boolean): MockElement[] {
    const results: MockElement[] = [];
    for (const child of root.children) {
        if (child instanceof MockElement) {
            if (matches(child)) {
                results.push(child);
            }
            const grandChildResults = findAllElements(child, matches);
            results.push(...grandChildResults);
        }
    }
    return results;
}

function findElement(root: MockElement, matches: (e: MockElement) => boolean): MockElement | null {
    for (const child of root.children) {
        if (child instanceof MockElement) {
            if (matches(child)) {
                return child;
            }
            const grandChild = findElement(child, matches);
            if (grandChild) return grandChild;
        }
    }
    return null;
}

function printTree(root: MockElement, indent = 0): void {
    const indentChar = '| ';
    const indentStr = indentChar.repeat(indent);
    console.log(`${indentStr}${root.toTagString()}`);
    for (const child of root.children) {
        if (child instanceof MockElement) {
            printTree(child, indent + 1);
        } else if (child instanceof MockTextNode) {
            console.log(`${indentChar.repeat(indent + 1)}"${child.data}"`);
        } else if (child instanceof MockCommentNode) {
            console.log(`${indentChar.repeat(indent + 1)}<!-- ${child.data} -->`);
        }
    }
}

type MenuView = 'main' | 'pause' | 'dead' | 'completed';
type GameControlAction = 'start' | 'pause' | 'resume' | 'game-over' | 'game-completed';

interface MenuProps {
    view: Signal<MenuView | null>;
    volume: Signal<number>;
    muted: Signal<boolean>;
    onGameControl: (action: GameControlAction) => void;
    onFullscreenToggle: () => void;
}

const Counter = wComponent<{initial: number}>((w, props) => {
    const clickedCount = signal(props.initial);
    const incrementValue = () => clickedCount.update((v) => v + 1);
    const decrementValue = () => clickedCount.update((v) => v - 1);

    return w.div(
        {class: 'mb-4'},
        w.div(
            {class: 'border border-green'},
            w.span({class: 'font-bold', id: '420'}, () => `Value is ${clickedCount()}`),
        ),
        w.button(
            {class: 'px-4 py-2 bg-blue text-white rounded', onclick: incrementValue},
            'Increment',
        ),
        w.button(
            {class: 'px-4 py-2 bg-blue text-white rounded', onclick: decrementValue},
            'Decrement',
        ),
    );
});

const Menu = wComponent((w, props: MenuProps) => {
    const {volume, muted, view, onGameControl, onFullscreenToggle} = props;

    return w.div(
        {
            class: 'menu',
            style: computed(() => {
                const styles: WCssStyleConfig = {};
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
                    ? MenuButton({onclick: () => onGameControl('resume')}, 'Resume')
                    : null,
            MenuButton({onclick: () => onGameControl('start')}, () => {
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
            MenuSettingsBar({volume, muted, onFullscreenToggle}),
            MenuControlsView(),
        ),
    );
});

interface MenuButtonProps {
    onclick: () => void;
}
const MenuButton = wComponent<MenuButtonProps, WChildrenInput>((w, props, children) => {
    return [w.button(props, ...children)];
});

const VOLUME_MIN = 0;
const VOLUME_MAX = 50;
const VOLUME_CHANGE_STEP = 1;
interface MenuSettingsBarProps {
    volume: Signal<number>;
    muted: Signal<boolean>;
    onFullscreenToggle: () => void;
}
const MenuSettingsBar = wComponent<MenuSettingsBarProps>((w, props) => {
    const {volume: volumeInput, muted, onFullscreenToggle} = props;
    const volume = signal(Math.round(volumeInput() * VOLUME_MAX));
    effect(() => {
        volumeInput.set(volume() / VOLUME_MAX);
    });

    return [
        w.div(
            {class: 'settings'},
            Slider({
                name: 'volume',
                min: VOLUME_MIN,
                max: VOLUME_MAX,
                step: VOLUME_CHANGE_STEP,
                value: volume,
                style: {width: '10rem'},
            }),
            IconButton(
                {
                    onclick: () => muted.update((m) => !m),
                },
                () => (muted() ? '🔇' : '🔊'),
            ),
            IconButton(
                {
                    style: {fontSize: '2rem'},
                    onclick: () => onFullscreenToggle(),
                },
                '⛶',
            ),
        ),
    ];
});

const MenuControlsView = wComponent((w) => {
    return [
        w.div(
            {class: 'menu-controls'},
            w.h2(
                {},
                'Controls',
                w.ul(
                    {class: 'controls-list'},
                    w.li(
                        {},
                        w.code({}, 'W'),
                        ' ',
                        w.code({}, 'S'),
                        ' ',
                        w.code({}, 'A'),
                        ' ',
                        w.code({}, 'D'),
                        ' - Move',
                    ),
                    w.li({}, w.code({}, 'Space'), ' - Shoot'),
                    w.li({}, w.code({}, 'P'), ' - Pause/Resume'),
                    w.li({}, w.code({}, 'F'), ' - Toggle Fullscreen'),
                    w.li({}, w.code({}, 'M'), ' - Toggle Music and Sounds'),
                ),
            ),
        ),
    ];
});

const IconButton = wComponent<WElementBasicAttributes, WChildrenInput>((w, props, children) => {
    return [w.button(props, ...children)];
});
interface SliderProps extends WElementBasicAttributes {
    name: string;
    label?: string;
    min?: number;
    max?: number;
    step?: number;
    value?: Signal<number>;
    hideValue?: boolean;
    children?: WRawChild[];
}

const Slider = wComponent((w, props: SliderProps) => {
    const {
        name,
        label,
        min = 0,
        max = 50,
        step = 1,
        value = signal(0),
        hideValue = false,
        style,
        children = [],
    } = props;
    const inputId = 'slider-volume';

    return [
        w.div(
            {class: 'menu-slider', style},
            w.label({for: inputId}, label),
            w.input({
                id: inputId,
                type: 'range',
                name: name,
                value: value(),
                min: min,
                title: computed(() => value().toString()),
                max: max,
                step: step,
                style: {
                    '--slider-min': `${min}`,
                    '--slider-max': `${max}`,
                    '--slider-value': `${value()}`,
                } as WCssStyleConfig,
                oninput: (ev) => {
                    if (!ev.target) return;
                    const input = ev.target as HTMLInputElement;
                    input.style.setProperty('--slider-min', `${min}`);
                    input.style.setProperty('--slider-max', `${max}`);
                    const inputValue = input.valueAsNumber;
                    input.style.setProperty('--slider-value', `${inputValue}`);
                    value.set(inputValue);
                },
            }),

            hideValue && w.span({}, value),
            ...children,
        ),
    ];
});

type NotificationKind = 'info' | 'warning' | 'error';

interface Notification {
    message: string;
    kind: NotificationKind;
    timeoutMs?: number;
    hidden: boolean;
    createdAt: number;
}
type NotificationOptions = Pick<Notification, 'message' | 'kind' | 'timeoutMs'>;

interface NotificationBarProps {
    notifications: ReadableSignal<Notification[]>;
    onFinished: () => void;
    fadeOutDurationMs?: number;
}

const NotificationBar = wComponent<NotificationBarProps>((w, props) => {
    const {notifications, onFinished, fadeOutDurationMs} = props;
    return [
        w.div(
            {class: 'notification-bar'},
            w.each(
                () => notifications(),
                (notification) => NotificationItem({notification, onFinished, fadeOutDurationMs}),
            ),
        ),
    ];
});

const FADE_OUT_DURATION_MS = 500;

const NotificationItem = wComponent<{
    notification: Notification;
    onFinished: () => void;
    fadeOutDurationMs?: number;
}>((w, props) => {
    const {notification, onFinished, fadeOutDurationMs = FADE_OUT_DURATION_MS} = props;
    const {message, kind, timeoutMs} = notification;
    const aliveMs = Date.now() - notification.createdAt;
    const fading = signal(false);
    const hidden = signal(notification.hidden);
    const fadeOutMs = timeoutMs ? timeoutMs + fadeOutDurationMs : 0;
    if (timeoutMs && !notification.hidden) {
        effect(() => {
            if (!hidden() && !fading()) {
                setTimeout(
                    () => {
                        fading.set(true);
                        const aliveMs = Date.now() - notification.createdAt;
                        setTimeout(() => hidden.set(true), Math.max(fadeOutMs - aliveMs, 0));
                    },
                    Math.max(timeoutMs - aliveMs, 0),
                );
            }
            notification.hidden = hidden();
            if (notification.hidden) onFinished();
        });
    }

    return w.div(
        {
            class: () => [
                'notification-item',
                'notification-item--' + kind,
                {
                    'notification-item--fading': fading(),
                },
            ],
        },
        w.div({class: 'notification-text'}, message),
    );
});
