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
    class?: string | string[];
    onClick?: (event: MouseEvent) => void;
    style?: CSSStyleInput;
}

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

function applyOptionsToElement(
    element: HTMLElement,
    options?: HTMLElementOptions,
    children?: HTMLElementChildren,
) {
    if (options?.id) {
        element.id = options.id;
    }
    if (options?.class) {
        const className = Array.isArray(options.class) ? options.class.join(' ') : options.class;
        element.className = className;
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

    static init(): UIContext {
        return new UIContext();
    }

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
        const element = node.node.get() as HTMLInputElement;
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
        const element = node.node.get() as HTMLLabelElement;
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
                node.setNode(newStyles);
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

type UIComponentFunc<TProps> = (ctx: UIContext, props: TProps) => UINode | UINode[];
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
        const childNodes = componentFunc(ctx, props);
        component.rootNode.children(childNodes);
        ctx.currentComponent = prevComponent;
        return component;
    };
}

class UIComponentInstance {
    rootNode!: UINode;
    readonly name?: string;
    private constructor(name?: string) {
        this.name = name;
    }

    static create(name?: string): UIComponentInstance {
        return new UIComponentInstance(name);
    }

    attachTo(element: Element): void {
        this.rootNode.attachTo(element);
    }
}

export type UIChildInput =
    | string
    | number
    | false
    | null
    | undefined
    | UINode
    | UIComponentInstance;

export type UIChildrenInput =
    | UIChildInput
    | ReadableSignal<UIChildInput>
    | (UIChildInput | ReadableSignal<UIChildInput>)[];

type UINodeSource = Element | string;

class UINode {
    node = signal<Element | Text | null>(null);
    parent: UINode | null;
    #children: UINode[] = [];

    constructor(nodeSource: UINodeSource | null, parent: UINode | null = null) {
        this.setNode(nodeSource);
        this.parent = parent;
    }

    setNode(nodeSource: UINodeSource | null): void {
        const currentNode = this.node.get();
        if (currentNode === nodeSource) return;

        if (nodeSource == null) {
            this.node.set(null);
            return;
        }

        if (nodeSource instanceof Element) {
            this.node.set(nodeSource);
            return;
        }

        if (currentNode instanceof Text) {
            currentNode.textContent = nodeSource;
        } else {
            const textNode = new Text(nodeSource);
            this.node.set(textNode);
        }
    }

    children(children: UIChildrenInput): this {
        const currentNode = this.node.get();
        if (currentNode instanceof Text) {
            throw new Error('UINode.children() cannot be called on a Text node.');
        }
        const normalizedChildren = normalizeUIChildren(children);

        for (const [childIndex, child] of normalizedChildren.entries()) {
            this.#children.push(child);
            const childNode = child.node.get();
            if (childNode?.parentNode) {
                throw new Error('UINode.children() cannot add a child that already has a parent.');
            }
            if (childNode) this.appendChild(childNode);
            this.subscribeForChildUpdates(child, childIndex);
        }

        return this;
    }

    attachTo(element: Element): void {
        const node = this.node;
        let currentNodeValue = node.get();
        if (currentNodeValue) {
            element.append(currentNodeValue);
        }
        node.subscribe((newNodeValue) => {
            if (newNodeValue) {
                if (currentNodeValue) {
                    currentNodeValue.replaceWith(newNodeValue);
                } else {
                    element.append(newNodeValue);
                }
            } else {
                currentNodeValue?.remove();
            }
            currentNodeValue = newNodeValue;
        });
    }

    private appendChild(child: Element | Text): void {
        const currentNode = this.node.get();
        if (!currentNode || currentNode instanceof Text) return;
        if (currentNode.shadowRoot) {
            // If element has a shadow root, prefer to use that.
            currentNode.shadowRoot.append(child);
        } else {
            currentNode.append(child);
        }
    }

    private subscribeForChildUpdates(child: UINode, childIndex: number): void {
        let currentChildNode = child.node.get();
        child.node.subscribe((newChildNode) => {
            const currentNode = this.node.get();
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
                        if (otherChild.node.get()) {
                            prevNonEmptyChild = otherChild;
                        }
                    }

                    if (prevNonEmptyChild) {
                        prevNonEmptyChild.node.get()?.after(newChildNode);
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
        const element = this.node.get();
        if (element instanceof HTMLElement) {
            applyOptionsToElement(element, options);
        }
        this.node.subscribe((newNode) => {
            if (newNode instanceof HTMLElement) {
                applyOptionsToElement(newNode, options);
            }
        });
        return this;
    }
}

function normalizeUIChildren(children?: UIChildrenInput): UINode[] {
    const arrayChildren = Array.isArray(children) ? children : [children];
    const result: UINode[] = [];
    for (const child of arrayChildren) {
        if (isReadableSignal(child)) {
            const childSignal = child;
            const nodeSource = makeNodeSourceFromInput(childSignal.get());
            const node = new UINode(nodeSource);
            result.push(node);
            childSignal.subscribe((newValue) => {
                const newNodeSource = makeNodeSourceFromInput(newValue);
                node.setNode(newNodeSource);
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

function makeNodeSourceFromInput(input: UIChildInput): UINodeSource | null {
    if (input === false || input == null) return null;
    // NOTE: Making source out of nodes and components is not allowed to prevent misuse.
    if (input instanceof UINode) {
        const source = input.node.get();
        if (source instanceof Text) return source.textContent ?? '';
        return source;
    }
    if (input instanceof UIComponentInstance) {
        const source = input.rootNode.node.get();
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
        // HACK: this has to be executed in the next macrotask since render can try to access uninitialized properties
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
