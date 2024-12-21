import {
    CustomElement,
    ReactiveElement,
    button,
    css,
    div,
    input,
    label,
} from '#/html';

type NumberOnChangeCallback = (value: number) => void;

type PickTypeKeys<TSource, TType> = {
    [TProp in keyof TSource]: TSource[TProp] extends TType ? TProp : never;
}[keyof TSource];

type PickType<TSource extends object, TType> = Pick<
    TSource,
    PickTypeKeys<TSource, TType>
>;

@CustomElement('dev-number-input')
export class DevNumberInput extends ReactiveElement {
    private static idCounter = 0;
    private readonly input = input({
        id: 'number-input-' + DevNumberInput.idCounter++,
        className: 'number-input',
        type: 'number',
    });
    private readonly label = label({
        textContent: 'Value',
        for: this.input.id,
    });
    // TODO: Why duplicate here and in label?
    private name?: string;
    private min!: number;
    private max!: number;
    private step!: number;
    private onChangeCallbacks: NumberOnChangeCallback[] = [];
    // TODO: decimals - Rounds the displayed value to a fixed number of decimals, without affecting the actual value

    constructor(
        private value: number,
        min: number = 0,
        max: number = 100,
        step: number = 1,
    ) {
        super();
        this.input.value = this.value.toString();
        this.setMin(min);
        this.setMax(max);
        this.setStep(step);
        this.input.addEventListener('change', () => {
            this.setValue(Number(this.input.value));
            for (const callback of this.onChangeCallbacks) {
                callback(this.value);
            }
        });
    }

    protected override render(): HTMLElement {
        console.log('render', this.value, this.min, this.max, this.step);
        return div({
            className: 'number-input-container',
            children: [this.label, this.input],
        });
    }

    protected override styles(): HTMLStyleElement {
        return css`
            .number-input-container {
                display: flex;
                flex-direction: row;
                margin: 0.5rem 0;
            }
            label {
                display: block;
                font-size: 0.8rem;
                font-weight: bold;
                padding-right: 0.5rem;
            }
            .number-input {
                width: 100%;
                padding: 0;
                margin: 0;
                box-sizing: border-box;
            }
        `;
    }

    setValue(value: number): this {
        assert(!isNaN(value), 'Value is NaN');
        if (value < this.min) {
            value = this.min;
        }
        if (value > this.max) {
            value = this.max;
        }
        if (value === this.value) {
            return this;
        }
        this.value = value;
        this.input.value = value.toString();
        return this;
    }

    setName(name: string): this {
        this.name = name;
        this.label.textContent = name;
        return this;
    }

    setMin(value: number): this {
        this.min = value;
        this.input.min = value.toString();
        if (this.value < this.min) {
            this.setValue(this.min);
        }
        return this;
    }

    setMax(value: number): this {
        this.max = value;
        this.input.max = value.toString();
        if (this.value > this.max) {
            this.setValue(this.max);
        }
        return this;
    }

    setStep(value: number): this {
        this.step = value;
        this.input.step = value.toString();
        return this;
    }

    bindValue<
        TSource extends object,
        TKey extends keyof PickType<TSource, number>,
    >(source: TSource, field: TKey): this {
        const value = source[field] as number;
        this.setValue(value);
        if (this.name === undefined && typeof field === 'string') {
            this.setName(field);
        }
        this.onChange((value) => {
            source[field] = value as TSource[TKey];
        });
        return this;
    }

    onChange(callback: (value: number) => void): this {
        this.onChangeCallbacks.push(callback);
        return this;
    }
}

@CustomElement('dev-button')
export class DevButton extends ReactiveElement {
    private readonly button = button({
        className: 'button',
    });

    protected override render(): HTMLElement {
        return this.button;
    }

    protected override styles(): HTMLStyleElement {
        return css`
            .button {
                padding: 0.5rem;
                margin: 0.5rem 0;
                background-color: lightblue;
                border: none;
                cursor: pointer;
            }
            .button:hover {
                background-color: lightgreen;
            }
        `;
    }

    onClick(callback: () => void): void {
        this.button.addEventListener('click', callback);
    }

    setName(name: string): this {
        this.button.textContent = name;
        return this;
    }
}
