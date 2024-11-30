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
