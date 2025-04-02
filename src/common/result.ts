export type Result<T, E = Error> = Ok<T, E> | Err<T, E>;

export namespace Result {
    export function ok<V, E>(val?: void): Ok<void, E>;
    export function ok<V, E>(val: V): Ok<V, E>;
    export function ok<V, E>(val: V): Ok<V, E> {
        return new Ok(val);
    }

    export function isResult<T, E>(result: unknown): result is Result<T, E> {
        return result instanceof Ok || result instanceof Err;
    }

    export function err<T, E = Error>(err: E): Err<T, E> {
        return new Err(err);
    }

    export function fromError<T>(error: string | Error): Err<T, Error> {
        const err = typeof error === 'string' ? new Error(error) : error;
        return new Err(err);
    }

    export function call<V>(func: () => V): Result<V, Error> {
        try {
            return ok(func());
        } catch (e) {
            return err(unknownErr(e));
        }
    }

    export function async<V, E = unknown>(
        source: (() => PromiseLike<Result<V, E>>) | PromiseLike<Result<V, E>>,
    ): AsyncResult<V, E>;
    export function async<V, E extends unknown = unknown>(
        source: (() => PromiseLike<V>) | PromiseLike<V>,
    ): AsyncResult<V, unknown>;
    export function async<V, E = unknown>(
        source: (() => PromiseLike<V | Result<V, E>>) | PromiseLike<V | Result<V, E>>,
    ): AsyncResult<V, E> | AsyncResult<V, unknown> {
        const promise = typeof source === 'function' ? source() : source;
        return new AsyncResult(
            Promise.resolve(promise)
                .then((awaited) => {
                    if (isResult(awaited)) return awaited;
                    return ok(awaited);
                })
                .catch((e) => err(e)),
        );
    }

    export function wrap<T>(err: unknown, message: string): Err<T, Error> {
        return new Err(wrapError(err, message));
    }

    export async function promise<T, E = unknown>(
        callback: (resolve: (value: T) => void, reject: (error: E) => void) => void,
    ): Promise<Result<T, E>> {
        return new Promise<Result<T, E>>((resolve) => {
            callback(
                (value) => resolve(ok(value)),
                (error) => resolve(err(error)),
            );
        });
    }

    function unknownErr(e: unknown): Error {
        if (e instanceof Error) return e;
        const err = new Error((e ?? 'unknown error').toString());
        return err;
    }
}

interface AbstractResult<T, E> {
    isOk(): this is Ok<T, E>;
    isOkAnd(func: (v: T) => boolean): this is Ok<T, E>;

    isErr(): this is Err<T, E>;
    isErrAnd(func: (err: E) => boolean): this is Err<T, E>;

    nullable(): T | null;

    unwrap(message?: string): T;
    unwrapOr(defaultVal: T): T;

    // Produce another result
    map<U>(callback: (v: T) => U): Result<U, E>;

    mapErr<U>(callback: (e: E) => U): Result<T, U>;

    // Calls func if the result is Err, otherwise returns the Ok value of self.
    orElse(func: (e: E) => T): T;

    // Wrap error with context message
    contextErr(message: string): Result<T, Error>;
}

class Ok<T, E> implements AbstractResult<T, E> {
    constructor(public readonly value: T) {}

    isOk(): this is Ok<T, E> {
        return true;
    }

    isOkAnd(func: (v: T) => boolean): this is Ok<T, E> {
        return func(this.value);
    }

    isErr(): this is Err<T, E> {
        return false;
    }

    isErrAnd(_func: (err: E) => boolean): this is Err<T, E> {
        return false;
    }

    nullable(): T | null {
        return this.value;
    }

    castErr<U>(): Ok<T, U> {
        // NOTE: This is safe because the error does not exist here.
        return this as Ok<T, unknown> as Ok<T, U>;
    }

    unwrap(): T {
        return this.value;
    }

    unwrapOr(): T {
        return this.value;
    }

    map<U>(callback: (v: T) => U): Result<U, E> {
        return ok(callback(this.value));
    }

    mapErr<U>(_callback: (e: E) => U): Result<T, U> {
        return this as Ok<T, unknown> as Ok<T, U>;
    }

    orElse(): T {
        return this.value;
    }

    contextErr(): Ok<T, Error> {
        return this as Ok<T, Error>;
    }
}

class Err<T, E> implements AbstractResult<T, E> {
    constructor(public readonly err: E) {}

    isOk(): this is Ok<T, E> {
        return false;
    }

    isOkAnd(_func: (v: T) => boolean): this is Ok<T, E> {
        return false;
    }

    isErr(): this is Err<T, E> {
        return true;
    }

    isErrAnd(func: (err: E) => boolean): this is Err<T, E> {
        return func(this.err);
    }

    nullable(): T | null {
        return null;
    }

    castValue<U>(): Err<U, E> {
        return this as Err<unknown, E> as Err<U, E>;
    }

    unwrap(message?: string): never {
        if (message != null) {
            throw wrapError(this.err, message);
        }
        throw this.err;
    }

    unwrapOr(defaultVal: T): T {
        return defaultVal;
    }

    map<U>(): Err<U, E> {
        return err(this.err);
    }

    mapErr<U>(callback: (e: E) => U): Result<T, U> {
        return err(callback(this.err));
    }

    orElse(func: (e: E) => T): T {
        return func(this.err);
    }

    contextErr(message: string): Err<T, Error> {
        return new Err(wrapError(this.err, message));
    }
}

class AsyncResult<T, E = unknown> implements PromiseLike<Result<T, E>> {
    constructor(private readonly promise: Promise<Result<T, E>>) {}

    // then<TResult extends Result<any, any> = Result<T, E>>(
    //     onfulfilled?: ((value: Result<T, E>) => TResult | PromiseLike<TResult>) | null,
    //     onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
    // ): AsyncResult<T, E> {
    //     const newP = this.promise.then(onfulfilled, onrejected);
    //     return new AsyncResult(newP);
    // }

    // then<TResult = T>(
    //     onfulfilled?: ((value: Result<T, E>) => TResult | PromiseLike<TResult>) | null,
    //     onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
    // ): AsyncResult<T, E> {
    //     const newP = this.promise.then(onfulfilled, onrejected);
    //     return newP
    // }

    then<A, B>(
        onfulfilled?: (res: Result<T, E>) => A | PromiseLike<A>,
        onrejected?: (reason: unknown) => B | PromiseLike<B>,
    ): PromiseLike<A | B> {
        return this.promise.then(onfulfilled, onrejected);
    }

    map<U>(callback: (v: T) => U): AsyncResult<U, E> {
        return Result.async(this.promise.then((result) => result.map(callback)));
    }

    mapPromise<U>(callback: (v: T) => PromiseLike<U>): AsyncResult<U, E> {
        return Result.async(
            this.promise.then((result): Result<U, E> | PromiseLike<Result<U, E>> => {
                if (result.isOk()) {
                    return callback(result.value).then((v) => ok<U, E>(v));
                }
                return result as Err<unknown, E> as Err<U, E>;
            }),
        );
    }

    mapErr<U>(callback: (e: E) => U): AsyncResult<T, U> {
        return Result.async(this.promise.then((result) => result.mapErr(callback)));
    }

    // Calls func if the result is Err, otherwise returns the Ok value of self.
    orElse(func: (e: E) => T): AsyncResult<T, E> {
        return Result.async(this.promise.then((result) => ok(result.orElse(func))));
    }

    // Wrap error with context message
    contextErr(message: string): AsyncResult<T, Error> {
        return Result.async(this.promise.then((result) => result.contextErr(message)));
    }
}

export const ok = Result.ok;
export const err = Result.err;

export function wrapError(err: unknown, message: string): Error {
    if (err instanceof Error) {
        const wrapped = new Error(message + '\n\t' + err.message, {cause: err});
        wrapped.stack = err.stack;
        return wrapped;
    }
    return new Error(message + '\n\t' + err);
}
