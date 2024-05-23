import { Opt } from './option';

export type Result<T, E = Error> = OkResult<T, E> | ErrResult<T, E>;

type RawResult<V> = { val: V; err?: never } | { val?: never; err: Error };

abstract class BaseResult<T, E> {
    static Ok<V, E>(val: V): Result<V, E> {
        return new OkResult(val);
    }

    static Err<T, E>(error: E): Result<T, E> {
        return new ErrResult(error);
    }

    static fromError<T>(error: string | Error): Result<T, Error> {
        const err = typeof error === 'string' ? new Error(error) : error;
        return new ErrResult(err);
    }

    static try<V>(func: () => V): Result<V, Error> {
        try {
            return Ok(func());
        } catch (e) {
            return Err(this.unknownErr(e));
        }
    }

    static async tryAsync<V>(
        source: () => PromiseLike<V> | PromiseLike<V>,
    ): Promise<Result<V>> {
        const promise = typeof source === 'function' ? source() : source;
        try {
            return Ok(await promise);
        } catch (e) {
            return Err(this.unknownErr(e));
        }
    }

    private static unknownErr(e: unknown): Error {
        if (e instanceof Error) return e;
        const err = new Error((e ?? 'unknown error').toString());
        return err;
    }

    get result(): RawResult<T> {
        if (this.isOk()) {
            return { val: this.val };
        }
        if (this.isErr()) {
            return { err: BaseResult.unknownErr(this.err) };
        }
        throw new Error('Unexpected result');
    }

    isOk(): this is OkResult<T, E> {
        return this instanceof OkResult;
    }

    isErr(): this is ErrResult<T, E> {
        return !this.isOk();
    }

    isOkAnd(func: (v: T) => boolean): boolean {
        return this.isOk() && func(this.val);
    }

    isErrAnd(func: (err: E) => boolean): boolean {
        return this.isErr() && func(this.err);
    }

    option(): Opt<T> {
        return this.isOk() ? Opt.Some(this.val) : Opt.None();
    }

    unwrapOr(defaultVal: T): T {
        return this.isOk() ? this.val : defaultVal;
    }

    // Produce another result
    map<U>(callback: (v: T) => U): Result<U, E> {
        if (this.isOk()) {
            return Result.Ok(callback(this.val));
        }
        if (this.isErr()) {
            return Result.Err(this.err);
        }
        throw new Error('Unexpected');
    }

    // Returns the provided default (if Err), or applies a function to the contained value (if Ok).
    // mapOr<U>(defaultValue: U, callback: (v: T) => U): U {
    //     const mapped = this.map(callback);
    //     const res = mapped.orElse(() => defaultValue);
    //     return res;
    // }

    // Calls func if the result is Err, otherwise returns the Ok value of self.
    orElse(func: (e: E) => T): T {
        if (this.isOk()) {
            return this.val;
        }
        if (this.isErr()) {
            return func(this.err);
        }
        throw new Error('Unexpected');
    }
}

export function Ok<V, E>(val: V): Result<V, E> {
    return BaseResult.Ok(val);
}

class OkResult<T, E> extends BaseResult<T, E> {
    constructor(public readonly val: T) {
        super();
    }
}

export function Err<T, E>(val: E): Result<T, E> {
    return BaseResult.Err(val);
}

class ErrResult<T, E> extends BaseResult<T, E> {
    constructor(public readonly err: E) {
        super();
    }
}

export const Result = {
    Ok: Ok,
    Err: Err,
    try: BaseResult.try.bind(BaseResult),
    tryAsync: BaseResult.tryAsync.bind(BaseResult),
};

// This is simpler version of Result
// function Ok<V>(val: V): RawResult<V> {
//     return { val };
// }
//
// function Err<V>(error: string | Error): RawResult<V> {
//     const err = typeof error === "string" ? new Error(error) : error;
//     return { err };
// }

// function test1() {
// const res = Ok(1 as const);
// res.orElse()
// const opt = Option.Some(1 as const);
// opt.orElse()

// }
