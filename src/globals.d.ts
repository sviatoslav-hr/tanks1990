import type {assert, assertError, throwError, wrapError} from '#/utils';
import type {Logger} from '#/common/logger';

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
    var logger: Logger;
    var BROWSER: boolean;
    var COMMIT_HASH: string;
    var GAME_VERSION: string;
}
