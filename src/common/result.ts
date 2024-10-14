export type Result<T, E = Error> = OkResult<T, E> | ErrorResult<T, E>;

export namespace Result {
    export function Ok<V, E>(val?: void): OkResult<void, E>;
    export function Ok<V, E>(val: V): OkResult<V, E>;
    export function Ok<V, E>(val: V): OkResult<V, E> {
        return new OkResult(val);
    }
    export function Err<T, E = Error>(err: E): ErrorResult<T, E> {
        return new ErrorResult(err);
    }

    export function fromError<T>(error: string | Error): ErrorResult<T, Error> {
        const err = typeof error === 'string' ? new Error(error) : error;
        return new ErrorResult(err);
    }

    export function call<V>(func: () => V): Result<V, Error> {
        try {
            return Ok(func());
        } catch (e) {
            return Err(unknownErr(e));
        }
    }

    export async function async<V>(
        source: (() => PromiseLike<V>) | PromiseLike<V>,
    ): Promise<Result<V>> {
        const promise = typeof source === 'function' ? source() : source;
        try {
            return Ok(await promise);
        } catch (e) {
            return Err(unknownErr(e));
        }
    }

    export function wrap<T>(
        err: unknown,
        message: string,
    ): ErrorResult<T, Error> {
        return new ErrorResult(wrapError(err, message));
    }

    export async function promise<T, E = unknown>(
        callback: (
            resolve: (value: T) => void,
            reject: (error: E) => void,
        ) => void,
    ): Promise<Result<T, E>> {
        return new Promise<Result<T, E>>((resolve) => {
            callback(
                (value) => resolve(Ok(value)),
                (error) => resolve(Err(error)),
            );
        });
    }

    function unknownErr(e: unknown): Error {
        if (e instanceof Error) return e;
        const err = new Error((e ?? 'unknown error').toString());
        return err;
    }
}

abstract class BaseResult<T, E> {
    isOk(): this is OkResult<T, E> {
        return this instanceof OkResult;
    }

    isErr(): this is ErrorResult<T, E> {
        return !this.isOk();
    }

    isOkAnd(func: (v: T) => boolean): boolean {
        return this.isOk() && func(this.val);
    }

    isErrAnd(func: (err: E) => boolean): boolean {
        return this.isErr() && func(this.err);
    }

    nullable(): T | null {
        return this.isOk() ? this.val : null;
    }

    abstract unwrap(message?: string): T;

    abstract unwrapOr(defaultVal: T): T;

    // Produce another result
    abstract map<U>(callback: (v: T) => U): Result<U, E>;

    // Returns the provided default (if Err), or applies a function to the contained value (if Ok).
    abstract mapOr<U>(defaultValue: U, callback: (v: T) => U): U;

    // Calls func if the result is Err, otherwise returns the Ok value of self.
    abstract orElse(func: (e: E) => T): T;

    // Wrap error with context message
    abstract context(message: string): Result<T, Error>;
}

class OkResult<T, E> extends BaseResult<T, E> {
    constructor(public readonly val: T) {
        super();
    }

    override unwrap(): T {
        return this.val;
    }

    override unwrapOr(): T {
        return this.val;
    }

    override map<U>(callback: (v: T) => U): Result<U, E> {
        return Result.Ok(callback(this.val));
    }

    override mapOr<U>(_defaultValue: U, callback: (v: T) => U): U {
        return callback(this.val);
    }

    override orElse(): T {
        return this.val;
    }

    override context(): OkResult<T, Error> {
        return this as OkResult<T, Error>;
    }
}

class ErrorResult<T, E> extends BaseResult<T, E> {
    constructor(public readonly err: E) {
        super();
    }

    override unwrap(message?: string): never {
        if (message != null) {
            throw wrapError(this.err, message);
        }
        throw this.err;
    }

    override unwrapOr(defaultVal: T): T {
        return defaultVal;
    }

    override map<U>(): ErrorResult<U, E> {
        return Result.Err(this.err);
    }

    override mapOr<U>(defaultValue: U): U {
        return defaultValue;
    }

    override orElse(func: (e: E) => T): T {
        return func(this.err);
    }

    override context(message: string): ErrorResult<T, Error> {
        return new ErrorResult(wrapError(this.err, message));
    }
}

export function wrapError(err: unknown, message: string): Error {
    if (err instanceof Error) {
        const wrapped = new Error(message + '\n\t' + err.message);
        wrapped.stack = err.stack;
        return wrapped;
    }
    return new Error(message + '\n\t' + err);
}
