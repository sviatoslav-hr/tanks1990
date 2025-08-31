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
                value: value.get(),
                min: min,
                title: computed(() => value.get().toString(), [value]),
                max: max,
                step: step,
                style: {
                    '--slider-min': `${min}`,
                    '--slider-max': `${max}`,
                    '--slider-value': `${value.get()}`,
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
                --track-transition: box-shadow 0.1s ease-in-out;
                --track-focus-shadow: 0 0 8px 1px var(--color-primary-light);
                --thumb-height: 1.25rem;
                --thumb-width: 1.25rem;
                --thumb-border-radius: 50%;
                --thumb-border: 1px solid var(--thumb-background);
                --thumb-background: var(--color-primary);
            }

            /* NOTE: This has to be duplicated for each browser because
                   browser ignore whole css rule once it sees unknown pseudo-element */
            input[type='range']::-webkit-slider-runnable-track {
                height: var(--track-height);
                background: var(--track-background);
                border-radius: var(--track-border-radius);
                transition: var(--track-transition);
            }
            input[type='range']:focus-within::-webkit-slider-runnable-track {
                box-shadow: var(--track-focus-shadow);
            }
            input[type='range']::-moz-range-track {
                height: var(--track-height);
                background: var(--track-background);
                border-radius: var(--track-border-radius);
                transition: var(--track-transition);
            }
            input[type='range']:focus-within::-moz-range-track {
                box-shadow: var(--track-focus-shadow);
            }

            /* Thumb */
            input[type='range']::-webkit-slider-thumb {
                -webkit-appearance: none;
                height: var(--thumb-height);
                width: var(--thumb-width);
                border-radius: var(--thumb-border-radius);
                background: var(--thumb-background);
                margin-top: calc(
                    (var(--track-height) - var(--thumb-height)) / 2
                ); /* center thumb on track */
                border: var(--thumb-border);
            }

            input[type='range']::-moz-range-thumb {
                height: var(--thumb-height);
                width: var(--thumb-width);
                border-radius: var(--thumb-border-radius);
                background: var(--color-primary);
                border: var(--thumb-border);
            }
        `,
    ];
});
