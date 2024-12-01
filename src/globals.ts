import {assert, assertError, throwError} from '#/utils';

(globalThis as any).window = globalThis;
window.assert = assert;
window.assertError = assertError;
window.panic = throwError;
