export function assert(condition: boolean, msg?: string): asserts condition {
    if (!condition) {
        throw new Error(msg ?? "Assertion failed");
    }
}

export function assertError(err: any): asserts err is Error {
    if (!(err instanceof Error)) {
        throw new Error("Assertion failed: err is not an Error");
    }
}

export function panic(msg: string): never {
    throw new Error(msg);
}
