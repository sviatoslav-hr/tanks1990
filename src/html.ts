export function html(
    segments: TemplateStringsArray,
    ...args: string[]
): string {
    if (segments.length === 1) {
        return segments[0]!;
    }
    return segments.reduce(
        (acc, segment, i) => acc + segment + (args[i] || ''),
        '',
    );
}

export function css(
    segments: TemplateStringsArray,
    ...args: string[]
): HTMLStyleElement {
    const style = document.createElement('style');
    if (segments.length === 1) {
        style.textContent = segments[0]!;
        return style;
    }
    style.textContent = segments.reduce(
        (acc, segment, i) => acc + segment + (args[i] || ''),
        '',
    );
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
                customElements.define(
                    tagName,
                    classOrTarget as Constructor<HTMLElement>,
                );
            });
        } else {
            customElements.define(
                tagName,
                classOrTarget as Constructor<HTMLElement>,
            );
        }
    };
}

export interface HTMLElementOptions {
    id?: string;
    className?: string | string[];
    textContent?: string;
    onClick?: (event: MouseEvent) => void;
    children?: HTMLElementChildren;
}

type HTMLElementChildren = string | HTMLElement | (string | HTMLElement)[];

function htmlElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    options?: HTMLElementOptions,
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName);
    applyOptionsToElement(element, options);
    return element;
}

export function div(options?: HTMLElementOptions): HTMLElement {
    const element = htmlElement('div', options);
    return element;
}

interface HTMLInputElementOptions extends HTMLElementOptions {
    type?: 'number';
    value?: string | number;
}

export function button(options?: HTMLElementOptions): HTMLButtonElement {
    const element = htmlElement('button', options);
    return element;
}

export function input(options?: HTMLInputElementOptions): HTMLInputElement {
    const element = htmlElement('input', options);
    if (options?.type) {
        element.type = options.type;
    }
    if (options?.value) {
        element.value = options.value.toString();
    }
    return element;
}

interface HTMLLabelElementOptions extends HTMLElementOptions {
    for?: string;
}

export function label(options?: HTMLLabelElementOptions): HTMLLabelElement {
    const element = htmlElement('label', options);
    if (options?.for) {
        element.htmlFor = options.for;
    }
    return element;
}

function applyOptionsToElement(
    element: HTMLElement,
    options?: HTMLElementOptions,
) {
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
            element.append(...children);
        } else {
            element.append(children);
        }
    }
    if (options?.onClick) {
        element.addEventListener('click', options.onClick);
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
        // HACK: this has to be executed in the next microtask since render can try to access uninitialized properties
        setTimeout(() => {
            const styles = this.styles();
            if (styles) {
                this.shadow.append(styles);
            }
            const elements = this.render();
            if (Array.isArray(elements)) {
                this.shadow.append(...elements);
            } else {
                this.shadow.append(elements);
            }
            this.rendered = true;
        });
    }

    protected afterRender(): void {}

    append(...elements: HTMLElement[]): void {
        setTimeout(() => {
            this.shadow.append(...elements);
        });
    }

    // TODO: try avoid inheritance
    protected abstract render(): HTMLElement | HTMLElement[];
    protected abstract styles(): HTMLStyleElement | null;
}
