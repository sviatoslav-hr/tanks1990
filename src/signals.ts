export interface ReadableSignal<T> {
    (): T;
    [SIGNAL_BRAND]: true;
}

export interface Signal<T> extends ReadableSignal<T> {
    set: (value: T) => void;
    update: (updater: SignalUpdater<T>) => void;
}

type SignalUpdater<T> = (value: T) => T;

export type ComputedSignalFn<T> = () => T;

type EffectFn = () => void;

interface SignalEffect {
    fn: EffectFn;
    destroyed: boolean;
    childEffects: Set<SignalEffect>;
    signals: Set<ReadableSignal<unknown>>;
}

const SIGNAL_BRAND = Symbol('Signal');

export function getSignal<T, U>(value: ReadableSignal<T> | U): ReadableSignal<T | U> {
    if (isReadableSignal(value)) {
        return value;
    }
    return signal(value);
}

// TODO: Convert to a class instead of reinventing a wheel?
// export function signal<T extends ReadableSignal<unknown>>(initialValue: T): T;
export function signal<T>(initialValue: T): Signal<T>;
export function signal<T = undefined>(initialValue?: T): Signal<T | undefined>;
export function signal<T>(initialValue?: T): Signal<typeof initialValue> {
    type TReturn = typeof initialValue;
    const effects: Set<SignalEffect> = new Set();
    const effectDuringInit = currentEffect; // In case signal is created inside an effect
    let currentValue = initialValue;

    function get(): TReturn {
        // NOTE: Init effect should NOT be added to effects list, because get,set called will trigger
        //       an infinite recursion.
        if (currentEffect && currentEffect !== effectDuringInit) {
            effects.add(currentEffect);
        }
        return currentValue;
    }

    function set(newValue: TReturn): void {
        if (Object.is(currentValue, newValue)) return;
        currentValue = newValue;
        // NOTE: Set seems to keep the order of effects, so child effects are run after parent effects
        for (const f of effects) {
            if (f.destroyed) {
                effects.delete(f);
                continue;
            }
            runEffect(f);
        }
    }

    function update(updated: SignalUpdater<TReturn>): void {
        const newValue = updated(currentValue);
        set(newValue);
    }

    const s: Signal<TReturn> = Object.assign(get, {
        set,
        update,
        [SIGNAL_BRAND]: true as const,
    });
    return s;
}

export function computed<T>(callback: ComputedSignalFn<T>): ReadableSignal<T> {
    // HACK: Set to null initially to avoid calling the callback twice during initialization.
    const result = signal(null as unknown as T);

    effect(() => {
        result.set(callback());
    });

    return result;
}

export function isReadableSignal<T>(value: unknown): value is ReadableSignal<T> {
    if (!value || typeof value !== 'function') return false;
    return Object.hasOwn(value, SIGNAL_BRAND);
}

export function effect(fn: EffectFn): void {
    const e: SignalEffect = {fn, destroyed: false, childEffects: new Set(), signals: new Set()};
    currentEffect?.childEffects.add(e);
    runEffect(e);
}

let currentEffect: SignalEffect | null = null;

function runEffect(e: SignalEffect): void {
    assert(!e.destroyed);
    const prevEffect = currentEffect;
    currentEffect = e;
    clearEffectDeps(e);
    try {
        e.fn();
    } finally {
        currentEffect = prevEffect;
    }
}

function clearEffectDeps(e: SignalEffect): void {
    for (const f of e.childEffects) {
        if (f.destroyed) continue;
        f.destroyed = true;
        e.childEffects.delete(f);
        clearEffectDeps(f);
    }
}
