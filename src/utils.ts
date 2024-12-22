export function assert(condition: any, msg?: string): asserts condition {
    if (!condition) {
        if (__DEV_MODE) {
            debugger;
        } else {
            throw new Error(msg ?? 'Assertion failed');
        }
    }
}

export function assertError(err: any): asserts err is Error {
    assert(err instanceof Error, 'Assertion failed: err is not an Error');
}

export function throwError(msg: string): never {
    throw new Error(msg);
}
