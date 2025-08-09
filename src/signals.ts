export interface ReadableSignal<T> {
    get: () => T;
    subscribe: (subscriber: SignalSubscriber<T>) => void;
}

export interface Signal<T> extends ReadableSignal<T> {
    set: (value: T) => void;
    update: (updater: SignalUpdater<T>) => void;
    [SIGNAL_BRAND]: true;
}

type SignalUpdater<T> = (value: T) => T;
type SignalSubscriber<T> = (newValue: T) => void;

const SIGNAL_BRAND = Symbol('Signal');

// TODO: Convert to a class instead of reinventing a wheel?
export function signal<T>(initialValue: T): Signal<T>;
export function signal<T = undefined>(initialValue?: T): Signal<T | undefined>;
export function signal<T>(initialValue?: T): Signal<typeof initialValue> {
    type TReturn = typeof initialValue;
    const subscribers: Set<SignalSubscriber<TReturn>> = new Set();

    function get(): TReturn {
        return s.value;
    }

    function set(newValue: TReturn): void {
        if (s.value !== newValue) {
            s.value = newValue;
            for (const subscriber of subscribers) {
                subscriber(s.value);
            }
        }
    }

    function update(updated: SignalUpdater<TReturn>): void {
        const newValue = updated(s.value);
        set(newValue);
    }

    function subscribe(subscriber: SignalSubscriber<TReturn>): void {
        subscribers.add(subscriber);
    }

    const s = {
        get,
        set,
        value: initialValue,
        update,
        subscribe,
        [SIGNAL_BRAND]: true as const,
    };
    return s;
}

export type ComputedFn<T> = () => T;

export function computed<T>(
    callback: ComputedFn<T>,
    sourceSignals: ReadableSignal<unknown>[],
): ReadableSignal<T> {
    const result = signal(callback());

    for (const sourceSignal of sourceSignals) {
        sourceSignal.subscribe(() => result.set(callback()));
    }

    return result;
}

export function isReadableSignal<T>(value: unknown): value is ReadableSignal<T> {
    if (!value || typeof value !== 'object') return false;
    return Object.hasOwn(value, SIGNAL_BRAND);
}

/*

What I want from signals:
- Accessing it's value
- Setting its value
- Subscribing to value changes
Computed signals:
- Accessing its value
- Subscribing to value changes
- Automatically updating when source signal changes


*/
