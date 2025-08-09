// HACK: This is needed for tests to run in Node.js

import {computed, isReadableSignal, ReadableSignal, signal, Signal} from '#/signals';

//       It would be nicer to do this mocking inside tests.
if (!globalThis.HTMLElement) {
    globalThis.HTMLElement =
        globalThis.HTMLElement ??
        (class {
            append() {}
            attachShadow() {
                return new globalThis.HTMLElement();
            }
        } as unknown as typeof HTMLElement);
    globalThis.customElements = globalThis.customElements ?? {define: () => {}};
    globalThis.document = globalThis.document ?? {
        createElement: () => new globalThis.HTMLElement(),
    };
}

export function html(segments: TemplateStringsArray, ...args: string[]): string;
export function html(
    segments: TemplateStringsArray,
    ...args: (string | Signal<string>)[]
): ReadableSignal<string>;
export function html(
    segments: TemplateStringsArray,
    ...args: (string | Signal<string>)[]
): string | ReadableSignal<string> {
    if (segments.length === 1) return segments[0]!;

    const sourceSignals = args.filter((arg) => typeof arg !== 'string');

    if (!sourceSignals.length) return buildTemplateString(segments, args);

    const result = computed(() => buildTemplateString(segments, args), sourceSignals);
    return result;
}

export function css(segments: TemplateStringsArray, ...args: string[]): HTMLStyleElement;
export function css(
    segments: TemplateStringsArray,
    ...args: (string | Signal<string>)[]
): ReadableSignal<HTMLStyleElement>;
export function css(
    segments: TemplateStringsArray,
    ...args: (string | Signal<string>)[]
): HTMLStyleElement | ReadableSignal<HTMLStyleElement> {
    if (segments.length === 1) {
        const style = document.createElement('style');
        style.textContent = segments[0]!;
        return style;
    }
    const sourceSignals = args.filter((arg) => typeof arg !== 'string');

    if (!sourceSignals.length) {
        const style = document.createElement('style');
        style.textContent = buildTemplateString(segments, args);
        return style;
    }

    const result = computed(() => {
        const style = document.createElement('style');
        buildTemplateString(segments, args);
        return style;
    }, sourceSignals);
    return result;
}

function buildTemplateString(
    segments: TemplateStringsArray,
    args: (string | Signal<string>)[],
): string {
    let result = '';
    for (let index = 0; index < segments.length; index++) {
        const segment = segments[index]!;
        const arg = args[index];
        let argString = '';
        if (typeof arg === 'string') {
            argString = arg;
        } else if (arg != null) {
            argString = arg.get();
        }
        result += segment + argString;
    }
    return result;
}

type Constructor<T> = {
    new (...args: any[]): T;
};
type CustomElementClass = Omit<typeof HTMLElement, 'new'>;
type CustomElementDecorator = (
    target: CustomElementClass,
    context: ClassDecoratorContext<Constructor<HTMLElement>>,
) => void;

export function CustomElement(tagName: string): CustomElementDecorator {
    return (
        classOrTarget: CustomElementClass | Constructor<HTMLElement>,
        context: ClassDecoratorContext<Constructor<HTMLElement>>,
    ) => {
        if (context) {
            context.addInitializer(() => {
                customElements.define(tagName, classOrTarget as Constructor<HTMLElement>);
            });
        } else {
            customElements.define(tagName, classOrTarget as Constructor<HTMLElement>);
        }
    };
}

export interface HTMLElementOptions {
    id?: string;
    class?: HTMLClassInput;
    title?: string | ReadableSignal<string>;
    onClick?: (event: MouseEvent) => void;
    style?: CSSStyleInput;
}

type HTMLClassInput = string | string[] | ReadableSignal<string | string[]>;

type HTMLElementChildren = (string | number | false | null | undefined | HTMLElement)[];

function htmlElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    options?: HTMLElementOptions,
    children?: HTMLElementChildren,
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName);
    applyOptionsToElement(element, options, children);
    return element;
}

interface HTMLInputElementOptions extends HTMLElementOptions {
    type?: 'number' | 'range' | 'file';
    name?: string;
    value?: string | number;
    min?: number;
    max?: number;
    step?: number;
    onChange?: (event: Event) => void;
    onInput?: (event: Event) => void;
}

interface HTMLLabelElementOptions extends HTMLElementOptions {
    for?: string;
}

/** @deprecated use UIContext instead */
export const oldUI = {
    div(options?: HTMLElementOptions, ...children: HTMLElementChildren): HTMLElement {
        return htmlElement('div', options, children);
    },
    h1(options?: HTMLElementOptions, ...children: HTMLElementChildren): HTMLHeadingElement {
        return htmlElement('h1', options, children);
    },
    h2(options?: HTMLElementOptions, ...children: HTMLElementChildren): HTMLHeadingElement {
        return htmlElement('h2', options, children);
    },
    h3(options?: HTMLElementOptions, ...children: HTMLElementChildren): HTMLHeadingElement {
        return htmlElement('h3', options, children);
    },
    h4(options?: HTMLElementOptions, ...children: HTMLElementChildren): HTMLHeadingElement {
        return htmlElement('h4', options, children);
    },
    h5(options?: HTMLElementOptions, ...children: HTMLElementChildren): HTMLHeadingElement {
        return htmlElement('h5', options, children);
    },
    h6(options?: HTMLElementOptions, ...children: HTMLElementChildren): HTMLHeadingElement {
        return htmlElement('h6', options, children);
    },
    p(options?: HTMLElementOptions, ...children: HTMLElementChildren): HTMLParagraphElement {
        return htmlElement('p', options, children);
    },
    span(options?: HTMLElementOptions, ...children: HTMLElementChildren): HTMLSpanElement {
        return htmlElement('span', options, children);
    },
    button(options?: HTMLElementOptions, ...children: HTMLElementChildren): HTMLButtonElement {
        return htmlElement('button', options, children);
    },
    input(options?: HTMLInputElementOptions, ...children: HTMLElementChildren): HTMLInputElement {
        const element = htmlElement('input', options, children);
        if (options?.type) {
            element.type = options.type;
        }
        if (options?.value) {
            element.value = options.value.toString();
        }
        if (options?.name) {
            element.name = options.name;
        }
        if (options?.min != null) {
            element.min = options.min.toString();
        }
        if (options?.max != null) {
            element.max = options.max.toString();
        }
        if (options?.step != null) {
            element.step = options.step.toString();
        }
        if (options?.onChange) {
            element.addEventListener('change', options.onChange);
        }

        return element;
    },
    label(options?: HTMLLabelElementOptions, ...children: HTMLElementChildren): HTMLLabelElement {
        const element = htmlElement('label', options, children);
        if (options?.for) {
            element.htmlFor = options.for;
        }
        return element;
    },
    ul(options?: HTMLElementOptions, ...children: HTMLElementChildren): HTMLUListElement {
        return htmlElement('ul', options, children);
    },
    li(options?: HTMLElementOptions, ...children: HTMLElementChildren): HTMLLIElement {
        return htmlElement('li', options, children);
    },
    code(options?: HTMLElementOptions, ...children: HTMLElementChildren): HTMLElement {
        return htmlElement('code', options, children);
    },
};

function applyClassName(element: HTMLElement, className: string | string[]): void {
    if (typeof className === 'string') {
        element.className = className;
    } else {
        element.className = className.join(' ').trim();
    }
}

function applyOptionsToElement(
    element: HTMLElement,
    options?: HTMLElementOptions,
    children?: HTMLElementChildren,
) {
    if (options?.id) {
        element.id = options.id;
    }
    if (options?.class) {
        if (isReadableSignal(options.class)) {
            applyClassName(element, options.class.get());
            options.class.subscribe((className) => applyClassName(element, className));
        } else {
            applyClassName(element, options.class);
        }
    }
    if (options?.title) {
        if (isReadableSignal(options.title)) {
            element.title = options.title.get();
            options.title.subscribe((title) => (element.title = title));
        } else {
            element.title = options.title;
        }
    }

    if (children != null) {
        element.append(...normalizeChildren(children));
    }

    if (options?.onClick) {
        element.addEventListener('click', options.onClick);
    }
    if (options?.style) {
        applyStyleToElement(element, options.style);
    }
}

function normalizeChildren(children: HTMLElementChildren): (string | HTMLElement)[] {
    const result: (string | HTMLElement)[] = [];
    for (const child of children) {
        if (child === false || child == null) {
            continue; // Skip falsy values
        }
        if (typeof child === 'string' || typeof child === 'number') {
            result.push(child.toString());
        } else if (child instanceof HTMLElement) {
            result.push(child);
        } else {
            logger.warn('Unsupported child type:', child);
        }
    }
    return result;
}

export type CSSStyleInput = CSSStyleConfig | ReadableSignal<CSSStyleConfig>;

export type CSSStyleConfig = Partial<
    Omit<
        CSSStyleDeclaration,
        | 'parentRule'
        | 'length'
        | 'getPropertyPriority'
        | 'getPropertyValue'
        | 'item'
        | 'removeProperty'
        | 'setProperty'
        | number
        | symbol
    >
>;

function applyStyleToElement(element: HTMLElement, style: CSSStyleInput) {
    if (isReadableSignal(style)) {
        let prevStyleConfig = style.get();
        setStyleConfig(element, prevStyleConfig);
        style.subscribe((newStyleConfig) => {
            for (const key of Object.keys(prevStyleConfig) as (keyof CSSStyleConfig)[]) {
                if (newStyleConfig[key] == null) {
                    newStyleConfig[key] = '';
                }
            }
            setStyleConfig(element, newStyleConfig);
            prevStyleConfig = newStyleConfig;
        });
    } else {
        setStyleConfig(element, style);
    }
}

function setStyleConfig(element: HTMLElement, style: CSSStyleConfig) {
    for (const pair of Object.entries(style)) {
        const key = pair[0] as keyof CSSStyleConfig;
        const value = pair[1] as CSSStyleDeclaration[typeof key];
        element.style[key] = value;
    }
}

export class UIContext {
    rootNode: UINode | null = null;
    currentComponent: UIComponentInstance | null = null;

    div(options?: HTMLElementOptions): UINode {
        return this.element('div', options);
    }
    h1(options?: HTMLElementOptions): UINode {
        return this.element('h1', options);
    }
    h2(options?: HTMLElementOptions): UINode {
        return this.element('h2', options);
    }
    h3(options?: HTMLElementOptions): UINode {
        return this.element('h3', options);
    }
    h4(options?: HTMLElementOptions): UINode {
        return this.element('h4', options);
    }
    h5(options?: HTMLElementOptions): UINode {
        return this.element('h5', options);
    }
    h6(options?: HTMLElementOptions): UINode {
        return this.element('h6', options);
    }
    p(options?: HTMLElementOptions): UINode {
        return this.element('p', options);
    }
    span(options?: HTMLElementOptions): UINode {
        return this.element('span', options);
    }
    button(options?: HTMLElementOptions): UINode {
        return this.element('button', options);
    }
    input(options?: HTMLInputElementOptions): UINode {
        const node = this.element('input', options);
        assert(isReadableSignal(node.element));
        const element = node.element.get() as HTMLInputElement;
        if (options?.type) {
            element.type = options.type;
        }
        if (options?.value) {
            element.value = options.value.toString();
        }
        if (options?.name) {
            element.name = options.name;
        }
        if (options?.min != null) {
            element.min = options.min.toString();
        }
        if (options?.max != null) {
            element.max = options.max.toString();
        }
        if (options?.step != null) {
            element.step = options.step.toString();
        }
        if (options?.onChange) {
            element.addEventListener('change', options.onChange);
        }
        if (options?.onInput) {
            element.addEventListener('input', options.onInput);
        }

        return node;
    }

    label(options?: HTMLLabelElementOptions): UINode {
        const node = this.element('label', options);
        assert(isReadableSignal(node.element));
        const element = node.element.get() as HTMLLabelElement;
        if (options?.for) {
            element.htmlFor = options.for;
        }
        return node;
    }

    ul(options?: HTMLElementOptions): UINode {
        return this.element('ul', options);
    }
    li(options?: HTMLElementOptions): UINode {
        return this.element('li', options);
    }
    code(options?: HTMLElementOptions): UINode {
        return this.element('code', options);
    }

    css = (segments: TemplateStringsArray, ...args: (string | Signal<string>)[]): UINode => {
        type StylesOrSignal = HTMLStyleElement | ReadableSignal<HTMLStyleElement>;
        const stylesElement: StylesOrSignal = css(segments, ...args);
        let element: HTMLStyleElement;
        if (isReadableSignal(stylesElement)) {
            element = stylesElement.get();
            stylesElement.subscribe((newStyles) => {
                node.setElement(newStyles);
            });
        } else {
            element = stylesElement;
        }
        const node = new UINode(element, null);
        return node;
    };

    element<K extends keyof HTMLElementTagNameMap>(
        tagName: K,
        options?: HTMLElementOptions,
    ): UINode {
        if (!this.currentComponent) {
            throw new Error('UIContext.element() can only be called inside of a component.');
        }
        const element = document.createElement(tagName);
        // NOTE: Parent node will be set later by the parent node itself.
        const node = new UINode(element, null);
        if (options) node.applyOptions(options);
        return node;
    }
}

export const uiGlobal = new UIContext();

type UIComponentFunc<TProps> = (
    ctx: UIContext,
    props: TProps,
    instance: UIComponentInstance,
) => UIChildrenInput | UIChildrenInput[];

type UIComponentInstanceFunc<TProps> = (ctx: UIContext, props: TProps) => UIComponentInstance;

export function UIComponent<TProps = void>(
    func: UIComponentFunc<TProps>,
): UIComponentInstanceFunc<TProps>;
export function UIComponent<TProps = void>(
    name: string,
    func: UIComponentFunc<TProps>,
): UIComponentInstanceFunc<TProps>;
export function UIComponent<TProps>(
    funcOrName: UIComponentFunc<TProps> | string,
    maybeFunc?: UIComponentFunc<TProps>,
): UIComponentInstanceFunc<TProps> {
    const componentFunc = typeof funcOrName === 'function' ? funcOrName : maybeFunc!;
    const name = typeof funcOrName === 'string' ? funcOrName : undefined;
    return (ctx: UIContext, props): UIComponentInstance => {
        const component = UIComponentInstance.create(name);
        // Keep prev component to handle hierarchy correctly.
        const prevComponent = ctx.currentComponent;
        ctx.currentComponent = component;
        const componentElement = new UIComponentElement(name);
        component.rootNode = new UINode(componentElement, null);
        const childNodes = componentFunc(ctx, props, component);
        component.rootNode.children(...normalizeUIChildren(childNodes));
        ctx.currentComponent = prevComponent;
        return component;
    };
}

export class UIComponentInstance {
    rootNode!: UINode;
    readonly name?: string;
    private constructor(name?: string) {
        this.name = name;
    }

    static create(name?: string): UIComponentInstance {
        return new UIComponentInstance(name);
    }

    appendTo(element: Element): void {
        this.rootNode.appendTo(element);
    }

    remove(): void {
        assert(isReadableSignal(this.rootNode.element));
        this.rootNode.element.get()?.remove();
    }
}

export type UIChildInputValue =
    | string
    | number
    | false
    | null
    | undefined
    | UINode
    | UIComponentInstance;

export type UIChildrenInput =
    | UIChildInputValue
    | ReadableSignal<UIChildInputValue>
    | ReadableSignal<UIChildInputValue[]>;

class UIChildrenCollection {
    readonly children = signal<(Element | Text)[]>([]);
    parentNode: UINode | null = null;

    set(nodes: (Element | Text)[]): void {
        this.children.set(nodes);
    }

    append(...nodes: (Element | Text)[]): void {
        this.children.update((currentChildren) => [...currentChildren, ...nodes]);
    }

    remove(): void {
        for (const c of this.children.get()) {
            if (c.parentNode) c.remove();
        }
    }
}

type UINodeSource = Element | string;
type UINodeElement = Element | Text | null;

class UINode {
    // NOTE: Still not sure having UIChildrenCollection here is a good idea...
    readonly element: Signal<UINodeElement> | UIChildrenCollection = signal<UINodeElement>(null);
    parent: UINode | null;
    #children: UINode[] = [];

    constructor(
        nodeSource: UINodeSource | UIChildrenCollection | null,
        parent: UINode | null = null,
    ) {
        if (nodeSource instanceof UIChildrenCollection) {
            this.element = nodeSource;
        } else {
            this.setElement(nodeSource);
        }
        this.parent = parent;
    }

    setElement(source: UINodeSource | null): void {
        if (this.element instanceof UIChildrenCollection) {
            throw new Error('UINode.setNode() does not support UIChildrenContainer.');
        }
        const currentElement = this.element.get();
        if (currentElement === source) return;

        if (source == null) {
            this.element.set(null);
            return;
        }

        if (source instanceof Element) {
            this.element.set(source);
            return;
        }

        if (currentElement instanceof Text) {
            currentElement.textContent = source;
        } else {
            const text = new Text(source);
            this.element.set(text);
        }
    }

    children(...children: UIChildrenInput[]): this {
        if (this.element instanceof UIChildrenCollection) {
            throw new Error('UINode.children() does not support UIChildrenContainer.');
        }
        const currentElement = this.element.get();
        if (currentElement instanceof Text) {
            throw new Error('UINode.children() cannot be called on a Text node.');
        }
        const normalizedChildren = normalizeUIChildren(children);

        for (const [childIndex, child] of normalizedChildren.entries()) {
            this.#children.push(child);
            if (isReadableSignal(child.element)) {
                const childElement = child.element.get();
                if (childElement?.parentNode) {
                    // prettier-ignore
                    throw new Error('UINode.children() cannot add a child that already has a parent.');
                }
                if (childElement) this.appendChild(childElement);
                this.subscribeForChildUpdates(child, childIndex);
            } else {
                child.appendTo(this);
            }
        }

        return this;
    }

    appendTo(parent: Element | UINode): void {
        const element = this.element;

        let parentElement: Element | null = null;
        if (parent instanceof UINode) {
            if (parent.element instanceof UIChildrenCollection) {
                // prettier-ignore
                throw new Error('UINode.appendTo() does not support UIChildrenCollection as parent.');
            }
            const p = parent.element.get();
            if (p instanceof Text) {
                throw new Error('UINode.appendTo() cannot append to a Text node.');
            }
            if (!p) return;
            parentElement = p;
        } else {
            parentElement = parent;
        }

        if (isReadableSignal(element)) {
            let currentNodeValue = element.get();
            if (currentNodeValue) {
                parentElement.append(currentNodeValue);
                // NOTE: Intentionally not subscribing to changes because it's expected to rebuild the children.
            }
            element.subscribe((newNodeValue) => {
                if (newNodeValue) {
                    if (currentNodeValue) {
                        currentNodeValue.replaceWith(newNodeValue);
                    } else {
                        parentElement.append(newNodeValue);
                    }
                } else {
                    currentNodeValue?.remove();
                }
                currentNodeValue = newNodeValue;
            });
            return;
        }

        {
            let currentChildren = element.children.get();
            parentElement.append(...currentChildren);
            element.children.subscribe((newChildren) => {
                for (const current of currentChildren) {
                    // TODO/PERF: Do not remove children that are in the newChildren.
                    current.remove();
                }
                parentElement.append(...newChildren);
                currentChildren = newChildren;
            });
        }
    }

    private appendChild(child: Element | Text): void {
        if (isReadableSignal(this.element)) {
            const currentElement = this.element.get();
            if (!currentElement || currentElement instanceof Text) return;

            if (child instanceof UIChildrenCollection) {
                return;
            }

            if (currentElement.shadowRoot) {
                // If element has a shadow root, prefer to use that.
                currentElement.shadowRoot.append(child);
            } else {
                currentElement.append(child);
            }
            return;
        } else {
        }
    }

    private subscribeForChildUpdates(child: UINode, childIndex: number): void {
        assert(!(child.element instanceof UIChildrenCollection));
        const nodeSignal = this.element;
        assert(!(nodeSignal instanceof UIChildrenCollection));
        let currentChildNode = child.element.get();
        child.element.subscribe((newChildNode) => {
            const currentNode = nodeSignal.get();
            if (!currentNode) return; // If the current node is null, we cannot update the child.
            assert(!(currentNode instanceof Text), 'Children should never be added to a Text node');

            if (newChildNode) {
                if (currentChildNode) {
                    currentChildNode.replaceWith(newChildNode);
                } else {
                    let prevNonEmptyChild: UINode | null = null;
                    for (let i = 0; i < childIndex; i++) {
                        const otherChild = this.#children.at(i);
                        assert(otherChild && otherChild !== child);
                        assert(!(otherChild.element instanceof UIChildrenCollection));
                        if (otherChild.element.get()) {
                            prevNonEmptyChild = otherChild;
                        }
                    }

                    if (prevNonEmptyChild) {
                        assert(!(prevNonEmptyChild.element instanceof UIChildrenCollection));
                        prevNonEmptyChild.element.get()?.after(newChildNode);
                    } else {
                        // If there is no previous non-empty child, we append the new child to the current node.
                        this.appendChild(newChildNode);
                    }
                }
            } else {
                currentChildNode?.remove();
            }

            currentChildNode = newChildNode;
        });
    }

    applyOptions(options: HTMLElementOptions): this {
        if (this.element instanceof UIChildrenCollection) {
            throw new Error('UINode.applyOptions() does not support UIChildrenContainer.');
        }
        const element = this.element.get();
        if (element instanceof HTMLElement) {
            applyOptionsToElement(element, options);
        }
        this.element.subscribe((newNode) => {
            if (newNode instanceof HTMLElement) {
                applyOptionsToElement(newNode, options);
            }
        });
        return this;
    }
}

export function extendUIChildren(
    input: UIChildrenInput | UIChildrenInput[],
    ...extention: UIChildrenInput[]
): UIChildrenInput[] {
    if (Array.isArray(input)) {
        return [...input, ...extention];
    }
    return [input, ...extention];
}

export function normalizeUIChildren(children?: UIChildrenInput | UIChildrenInput[]): UINode[] {
    const arrayChildren = Array.isArray(children) ? children : [children];
    const result: UINode[] = [];
    for (const child of arrayChildren) {
        if (isReadableSignal(child)) {
            const childSignal = child;
            const children = childSignal.get();
            if (Array.isArray(children)) {
                const collection = new UIChildrenCollection();
                const node = new UINode(collection, null);
                const sources: (Element | Text)[] = [];
                for (const c of children) {
                    const source = makeNodeSourceFromInput(c);
                    if (source) {
                        sources.push(typeof source === 'string' ? new Text(source) : source);
                    }
                }
                collection.set(sources);
                result.push(node);
                childSignal.subscribe((newValue) => {
                    assert(Array.isArray(newValue));
                    const sources: (Element | Text)[] = [];
                    for (const c of newValue) {
                        const source = makeNodeSourceFromInput(c);
                        if (source) {
                            sources.push(typeof source === 'string' ? new Text(source) : source);
                        }
                    }
                    collection.set(sources);
                });
                continue;
            }
            const nodeSource = makeNodeSourceFromInput(children);
            const node = new UINode(nodeSource);
            result.push(node);
            childSignal.subscribe((newValue) => {
                assert(!Array.isArray(newValue));
                const newNodeSource = makeNodeSourceFromInput(newValue);
                node.setElement(newNodeSource);
            });
        } else if (child instanceof UIComponentInstance) {
            result.push(child.rootNode);
        } else if (child instanceof UINode) {
            result.push(child);
        } else {
            const nodeSource = makeNodeSourceFromInput(child);
            const node = new UINode(nodeSource);
            result.push(node);
        }
    }
    return result;
}

function makeNodeSourceFromInput(input: UIChildInputValue): UINodeSource | null {
    if (input === false || input == null) return null;
    // NOTE: Making source out of nodes and components is not allowed to prevent misuse.
    if (input instanceof UINode) {
        if (input.element instanceof UIChildrenCollection) {
            // prettier-ignore
            throw new Error('UIChildrenCollection cannot be directly used as a child of another UINode.');
        }
        const source = input.element.get();
        if (source instanceof Text) return source.textContent ?? '';
        return source;
    }
    if (input instanceof UIComponentInstance) {
        if (input.rootNode.element instanceof UIChildrenCollection) {
            // prettier-ignore
            throw new Error('UIChildrenCollection cannot be directly used as a rootNode of a UIComponentInstance.');
        }
        const source = input.rootNode.element.get();
        if (source instanceof Text) return source.textContent ?? '';
        return source;
    }
    if (typeof input === 'number') return input.toString();
    return input;
}

@CustomElement('ui-component')
export class UIComponentElement extends HTMLElement {
    constructor(name?: string) {
        super();
        this.attachShadow({mode: 'open'});
        if (name) {
            this.dataset['name'] = name;
        }
    }
}

/** @deprecated use UIComponent instead */
export abstract class ReactiveElement extends HTMLElement {
    readonly shadowRoot: null = null;
    protected rendered = false;
    protected shadow: ShadowRoot;
    private appendedElements = signal<HTMLElement[]>([]);
    private content: ReadableSignal<HTMLElement[]> | null = null;

    constructor(options?: HTMLElementOptions) {
        super();
        this.shadow = this.attachShadow({mode: 'open'});
        applyOptionsToElement(this, options);
        this.setAttribute('reactive-element', ''); // NOTE: This attribute is used to inherit styles from :root.
        // HACK: this has to be executed in the next macro-task since render can try to access uninitialized properties
        setTimeout(() => {
            this.content = this.makeContentSignal();
            this.shadow.append(...this.content.get());
            this.rendered = true;
            this.afterRender();
            this.content.subscribe((newContent) => {
                // TODO: We need something better here... just replacing causes flickering.
                this.shadow.replaceChildren(...newContent);
                this.afterRender();
            });
        });
    }

    protected afterRender(): void {}

    append(...elements: HTMLElement[]): void {
        this.appendedElements.update((current) => [...current, ...elements]);
        // TODO: Double check if rerender work without calling this.
        // if (this.rendered) this.rerender();
    }

    private makeContentSignal(): ReadableSignal<HTMLElement[]> {
        const renderContent = this.render();
        const stylesContent = this.styles();
        const sourceSignals = [
            ...(isReadableSignal(renderContent) ? [renderContent] : []),
            ...(isReadableSignal(stylesContent) ? [stylesContent] : []),
            this.appendedElements,
        ];
        return computed(() => {
            const content = buildContent(renderContent, stylesContent, this.appendedElements);
            return content;
        }, sourceSignals);
    }

    // TODO: try avoid inheritance
    protected abstract render():
        | HTMLElement
        | HTMLElement[]
        | ReadableSignal<HTMLElement | HTMLElement[]>;
    protected abstract styles(): HTMLStyleElement | ReadableSignal<HTMLStyleElement> | null;
}

function buildContent(
    renderContent: HTMLElement | HTMLElement[] | ReadableSignal<HTMLElement | HTMLElement[]>,
    stylesContent: HTMLStyleElement | ReadableSignal<HTMLStyleElement> | null,
    appendedContent: ReadableSignal<HTMLElement[]>,
): HTMLElement[] {
    let renderElements: HTMLElement[] | undefined;
    if (isReadableSignal(renderContent)) {
        const tempt = renderContent.get();
        renderElements = Array.isArray(tempt) ? tempt : [tempt];
    } else {
        renderElements = Array.isArray(renderContent) ? renderContent : [renderContent];
    }

    if (stylesContent) {
        const styles = isReadableSignal(stylesContent) ? stylesContent.get() : stylesContent;
        return [styles, ...renderElements, ...appendedContent.get()];
    }
    return [...renderElements, ...appendedContent.get()];
}
