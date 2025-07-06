import {css, CustomElement, ReactiveElement, ui} from '#/ui/html';

type NumberOnChangeCallback = (value: number) => void;

type PickTypeKeys<TSource, TType> = {
    [TProp in keyof TSource]: TSource[TProp] extends TType ? TProp : never;
}[keyof TSource];

type PickType<TSource extends object, TType> = Pick<TSource, PickTypeKeys<TSource, TType>>;

@CustomElement('dev-number-input')
export class DevNumberInput extends ReactiveElement {
    private static idCounter = 0;
    private readonly input = ui.input({
        id: 'number-input-' + DevNumberInput.idCounter++,
        className: 'number-input',
        type: 'number',
    });
    private readonly label = ui.label({
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
            if (false) {
                logger.TODO('step is not implemented, step=%d', this.step);
            }
            this.setValue(Number(this.input.value));
            for (const callback of this.onChangeCallbacks) {
                callback(this.value);
            }
        });
    }

    protected override render(): HTMLElement {
        return ui.div({
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

    bindValue<TSource extends object, TKey extends keyof PickType<TSource, number>>(
        source: TSource,
        field: TKey,
    ): this {
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
    private readonly button = ui.button({
        className: 'button',
    });

    protected override render(): HTMLElement {
        return this.button;
    }

    protected override styles(): HTMLStyleElement {
        return css`
            .button {
                padding: 0.5rem;
                border: 1px solid #00ff00;
                background-color: transparent;
                cursor: pointer;
            }
            .button:hover {
                border-color: #00fff0;
            }
        `;
    }

    onClick(callback: (bth: this) => void): void {
        this.button.addEventListener('click', () => callback(this));
    }

    setName(name: string): this {
        this.button.textContent = name;
        return this;
    }
}

@CustomElement('dev-file-picker')
export class DevFilePicker extends ReactiveElement {
    private static idCounter = 0;
    private readonly input = ui.input({
        id: 'file-input-' + DevFilePicker.idCounter++,
        type: 'file',
    });
    private placeholder = 'Select file';
    private readonly label = ui.label({
        textContent: this.placeholder,
        for: this.input.id,
        className: 'button',
    });

    protected override render(): HTMLElement[] {
        return [this.input, this.label];
    }

    protected afterRender(): void {
        this.input.addEventListener('change', () => {
            const file = this.input.files?.[0];
            this.label.textContent = file ? file.name : this.placeholder;
        });
    }

    protected override styles(): HTMLStyleElement {
        return css`
            .button {
                padding: 0.5rem;
                border: 1px solid #00ff00;
                background-color: transparent;
                cursor: pointer;
                max-width: 120px;
                text-overflow: ellipsis;
                text-wrap: nowrap;
                overflow-x: clip;
                display: inline-block;
                font-size: 13.3px;
                line-height: normal;
            }
            .button:hover {
                border-color: #00fff0;
            }
            input[type='file'] {
                display: none;
            }
        `;
    }

    onSelect(callback: (f: FileList) => void): void {
        this.input.addEventListener('change', () => {
            const files = this.input.files;
            if (files) callback(files);
        });
    }

    setContentType(contentType: string): this {
        this.input.accept = contentType;
        return this;
    }

    setMultiple(multiple: boolean): this {
        this.input.multiple = multiple;
        return this;
    }

    setPlaceholder(placeholder: string): this {
        this.placeholder = placeholder;
        if (!this.input.files?.length) {
            this.label.textContent = placeholder;
        }
        return this;
    }
}
