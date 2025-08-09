import {computed, signal, type Signal} from '#/signals';
import {
    CSSStyleInput,
    type HTMLElementOptions,
    normalizeUIChildren,
    UIChildrenInput,
    UIComponent,
} from '#/ui/core';

export interface ButtonProps {
    onClick?: () => void;
    style?: CSSStyleInput;
    children?: UIChildrenInput | UIChildrenInput[];
}

export const Button = UIComponent('button', (ui, props: ButtonProps) => {
    const {onClick, children, style} = props;
    return ui.button({onClick, style}).children(...normalizeUIChildren(children));
});

interface SliderProps extends HTMLElementOptions {
    name: string;
    label?: string;
    min?: number;
    max?: number;
    step?: number;
    value?: Signal<number>;
    hideValue?: boolean;
}

export const Slider = UIComponent('slider', (ui, props: SliderProps) => {
    const {name, label, min = 0, max = 50, step = 1, value = signal(0), hideValue = false} = props;
    const css = ui.css;
    const inputId = 'slider-volume';

    return [
        ui.div({class: 'menu-slider'}).children(
            ui.label({for: inputId}).children(label),
            ui.input({
                id: inputId,
                type: 'range',
                name: name,
                value: value.get(),
                min: min,
                title: computed(() => value.get().toString(), [value]),
                max: max,
                step: step,
                onInput: (ev) => {
                    if (!ev.target) return;
                    const inputValue = (ev.target as HTMLInputElement).valueAsNumber;
                    value.set(inputValue);
                },
            }),

            hideValue && ui.span({}).children(value),
        ),
        css`
            .menu-slider {
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            #${inputId} {
                flex-grow: 1;
            }
        `,
    ];
});
