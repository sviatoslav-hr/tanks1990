import type {assert, assertError, throwError, wrapError} from '#/utils';

type AssertFn = typeof assert;
type AssertErrorFn = typeof assertError;
type WrapErrorFn = typeof wrapError;
type PanicFn = typeof throwError;

declare global {
    var assert: AssertFn;
    var assertError: AssertErrorFn;
    var wrapError: WrapErrorFn;
    var panic: PanicFn;
    var __DEV_MODE: boolean;
}
