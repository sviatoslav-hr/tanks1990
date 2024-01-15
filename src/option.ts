import { Result } from "./result";

export type Opt<T> = SomeOption<T> | NoneOption<T>;

abstract class BaseOption<T> {
    static fromNullable<T extends {}>(val?: T | null): Opt<T> {
        return val == null ? None() : Some(val);
    }

    isSome(): this is SomeOption<T> {
        return this instanceof SomeOption;
    }

    isNone(): this is NoneOption<T> {
        return this instanceof NoneOption;
    }

    asNullable(): T | undefined {
        return this.isSome() ? this.val : undefined;
    }

    asSlice(): [T] | [] {
        return this.isSome() ? [this.val] : [];
    }

    expect(message: string): T {
        if (this.isSome()) {
            return this.val;
        }
        throw new Error(message);
    }

    unwrapOr(defaultValue: T): T {
        return this.isSome() ? this.val : defaultValue;
    }

    unwrapOrElse(func: () => T): T {
        return this.isSome() ? this.val : func();
    }

    map<U>(func: (val: T) => U): Opt<U> {
        return this.isSome() ? Some(func(this.val)) : None();
    }

    mapOr<U>(defaultVal: U, func: (val: T) => U): U {
        return this.isSome() ? func(this.val) : defaultVal;
    }

    mapOrElse<U>(defaultFunc: () => U, func: (val: T) => U): U {
        return this.isSome() ? func(this.val) : defaultFunc();
    }

    okOr<E>(err: E): Result<T, E> {
        return this.isSome() ? Result.Ok(this.val) : Result.Err(err);
    }

    inspect(func: (val: T) => void): this {
        if (this.isSome()) {
            func(this.val);
        }
        return this;
    }

    and<U>(optb: Opt<U>): Opt<U> {
        return this.isSome() ? optb : None();
    }

    andThen<U>(func: () => Opt<U>): Opt<U> {
        return this.isSome() ? func() : None();
    }

    or(optb: Opt<T>): Opt<T> {
        return this.isSome() ? this : optb;
    }

    orElse(func: () => Opt<T>): Opt<T> {
        return this.isSome() ? this : func();
    }

    // orElseThrow()
}

export function Some<V>(val: V): Opt<V> {
    return new SomeOption(val);
}

class SomeOption<V> extends BaseOption<V> {
    constructor(public readonly val: V) {
        super();
    }
}

export function None<V>(): Opt<V> {
    return new NoneOption();
}

class NoneOption<T> extends BaseOption<T> {
    constructor() {
        super();
    }
}

export const Opt = {
    Some: Some,
    None: None,
    from: BaseOption.fromNullable.bind(BaseOption),
};
