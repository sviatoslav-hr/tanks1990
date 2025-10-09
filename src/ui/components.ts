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
    children?: UIChildrenInput | UIChildrenInput[];
}

export const Slider = UIComponent('slider', (ui, props: SliderProps) => {
    const {
        name,
        label,
        min = 0,
        max = 50,
        step = 1,
        value = signal(0),
        hideValue = false,
        style,
        children,
    } = props;
    const css = ui.css;
    const inputId = 'slider-volume';

    return [
        ui.div({class: 'menu-slider', style}).children(
            ui.label({for: inputId}).children(label),
            ui.input({
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
                } as CSSStyleInput,
                onInput: (ev) => {
                    if (!ev.target) return;
                    const input = ev.target as HTMLInputElement;
                    input.style.setProperty('--slider-min', `${min}`);
                    input.style.setProperty('--slider-max', `${max}`);
                    const inputValue = input.valueAsNumber;
                    input.style.setProperty('--slider-value', `${inputValue}`);
                    value.set(inputValue);
                },
            }),

            hideValue && ui.span({}).children(value),
            ...normalizeUIChildren(children),
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
            input[type='range'] {
                --slider-range: calc(var(--slider-max) - var(--slider-min));
                --slider-ratio: calc(
                    (var(--slider-value) - var(--slider-min)) / var(--slider-range)
                );
                --sx: calc(
                    0.5 * var(--thumb-width) + var(--slider-ratio) * (100% - var(--thumb-width))
                );
                -webkit-appearance: none;
                background: transparent;
                cursor: pointer;
                outline: none;
                --track-height: 6px;
                --track-background: linear-gradient(
                    to right,
                    var(--color-primary) 0%,
                    var(--color-primary) var(--sx),
                    var(--color-primary-light) var(--sx),
                    var(--color-primary-light) 100%
                );
                --track-border-radius: 3px;
                --thumb-height: 1.25rem;
                --thumb-width: 1.25rem;
                --thumb-background: var(--color-primary);
                --thumb-border-radius: 50%;
                --thumb-transition: outline 0.2s ease-in-out;
                --thumb-focus-outline: 3px solid var(--thumb-background);
                --thumb-focus-outline-offset: 3px;
            }

            /* NOTE: This has to be duplicated for each browser because
                   browser ignore whole css rule once it sees unknown pseudo-element */
            input[type='range']::-webkit-slider-runnable-track {
                height: var(--track-height);
                background: var(--track-background);
                border-radius: var(--track-border-radius);
            }
            input[type='range']::-moz-range-track {
                height: var(--track-height);
                background: var(--track-background);
                border-radius: var(--track-border-radius);
            }

            /* Thumb */
            input[type='range']::-webkit-slider-thumb {
                -webkit-appearance: none;
                border: none;
                height: var(--thumb-height);
                width: var(--thumb-width);
                border-radius: var(--thumb-border-radius);
                background: var(--thumb-background);
                margin-top: calc(
                    (var(--track-height) - var(--thumb-height)) / 2
                ); /* center thumb on track */
                transition: var(--thumb-transition);
            }
            input[type='range']:focus-visible::-webkit-slider-thumb {
                outline: var(--thumb-focus-outline);
                outline-offset: var(--thumb-focus-outline-offset);
            }

            input[type='range']::-moz-range-thumb {
                border: none;
                height: var(--thumb-height);
                width: var(--thumb-width);
                border-radius: var(--thumb-border-radius);
                background: var(--color-primary);
                transition: var(--thumb-transition);
            }
            input[type='range']:focus-visible::-moz-range-thumb {
                outline: var(--thumb-focus-outline);
                outline-offset: var(--thumb-focus-outline-offset);
            }
        `,
    ];
});
