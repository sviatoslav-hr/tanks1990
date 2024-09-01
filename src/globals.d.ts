import type { assert, assertError, panic } from './utils';

type AssertFn = typeof assert;
type AssertErrorFn = typeof assertError;
type PanicFn = typeof panic;

declare global {
    var assert: AssertFn;
    var assertError: AssertErrorFn;
    var panic: PanicFn;
}
