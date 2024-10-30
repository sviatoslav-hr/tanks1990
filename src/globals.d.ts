import type { assert, assertError, throwError } from './utils';

type AssertFn = typeof assert;
type AssertErrorFn = typeof assertError;
type PanicFn = typeof throwError;

declare global {
    var assert: AssertFn;
    var assertError: AssertErrorFn;
    var panic: PanicFn;
    var __DEV_MODE: boolean;
}
