// HACK: This is needed for tests to run in Node.js
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

export function html(segments: TemplateStringsArray, ...args: string[]): string {
    if (segments.length === 1) {
        return segments[0]!;
    }
    return segments.reduce((acc, segment, i) => acc + segment + (args[i] || ''), '');
}

export function css(segments: TemplateStringsArray, ...args: string[]): HTMLStyleElement {
    const style = document.createElement('style');
    if (segments.length === 1) {
        style.textContent = segments[0]!;
        return style;
    }
    style.textContent = segments.reduce((acc, segment, i) => acc + segment + (args[i] || ''), '');
    return style;
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
    className?: string | string[];
    textContent?: string;
    onClick?: (event: MouseEvent) => void;
    children?: HTMLElementChildren;
    style?: CSSStyleConfig;
}

type HTMLElementChildren = string | HTMLElement | (string | HTMLElement | null | false)[];

function htmlElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    options?: HTMLElementOptions,
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName);
    applyOptionsToElement(element, options);
    return element;
}

interface HTMLInputElementOptions extends HTMLElementOptions {
    type?: 'number' | 'file';
    value?: string | number;
}

interface HTMLLabelElementOptions extends HTMLElementOptions {
    for?: string;
}

export const ui = {
    div(options?: HTMLElementOptions): HTMLElement {
        const element = htmlElement('div', options);
        return element;
    },
    button(options?: HTMLElementOptions): HTMLButtonElement {
        const element = htmlElement('button', options);
        return element;
    },
    input(options?: HTMLInputElementOptions): HTMLInputElement {
        const element = htmlElement('input', options);
        if (options?.type) {
            element.type = options.type;
        }
        if (options?.value) {
            element.value = options.value.toString();
        }
        return element;
    },
    label(options?: HTMLLabelElementOptions): HTMLLabelElement {
        const element = htmlElement('label', options);
        if (options?.for) {
            element.htmlFor = options.for;
        }
        return element;
    },
};

function applyOptionsToElement(element: HTMLElement, options?: HTMLElementOptions) {
    if (options?.id) {
        element.id = options.id;
    }
    if (options?.className) {
        const className = Array.isArray(options.className)
            ? options.className.join(' ')
            : options.className;
        element.className = className;
    }
    if (options?.textContent) {
        element.textContent = options.textContent;
    }
    if (options?.children) {
        const {children} = options;
        if (typeof children === 'string') {
            element.textContent = children;
        } else if (Array.isArray(children)) {
            element.append(...children.filter((c) => c != null && c !== false));
        } else {
            element.append(children);
        }
    }
    if (options?.onClick) {
        element.addEventListener('click', options.onClick);
    }
    if (options?.style) {
        applyStyleToElement(element, options.style);
    }
}

type CSSStyleConfig = Partial<
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

function applyStyleToElement(element: HTMLElement, style: CSSStyleConfig) {
    for (const pair of Object.entries(style)) {
        const key = pair[0] as keyof CSSStyleConfig;
        const value = pair[1] as CSSStyleDeclaration[typeof key];
        element.style[key] = value;
    }
}

export abstract class ReactiveElement extends HTMLElement {
    readonly shadowRoot: null = null;
    protected rendered = false;
    protected shadow: ShadowRoot;

    constructor(options?: HTMLElementOptions) {
        super();
        this.shadow = this.attachShadow({mode: 'open'});
        applyOptionsToElement(this, options);
        // HACK: this has to be executed in the next macrotask since render can try to access uninitialized properties
        setTimeout(() => {
            this.shadow.append(...this.constructContent());
            this.rendered = true;
            this.afterRender();
        });
    }

    protected afterRender(): void {}

    append(...elements: HTMLElement[]): void {
        setTimeout(() => {
            this.shadow.append(...elements);
        });
    }

    rerender(): void {
        if (!this.rendered) {
            logger.warn('Rerender called before initial render for element %s', this.tagName);
            return;
        }
        this.shadow.innerHTML = '';
        this.shadow.append(...this.constructContent());
        this.afterRender();
    }

    private constructContent(): HTMLElement[] {
        const renderContent = this.render();
        const elements = Array.isArray(renderContent) ? renderContent : [renderContent];
        const styles = this.styles();
        if (styles) {
            return [styles, ...elements];
        }
        return elements;
    }

    // TODO: try avoid inheritance
    protected abstract render(): HTMLElement | HTMLElement[];
    protected abstract styles(): HTMLStyleElement | null;
}
