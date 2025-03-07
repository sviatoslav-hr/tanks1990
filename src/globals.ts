import {assert, assertError, throwError} from '#/utils';

if (!globalThis.window) {
    // HACK: make `window` global available in tests
    (globalThis as any).window = globalThis;
}
window.__DEV_MODE = !!window.__DEV_MODE;
window.assert = assert;
window.assertError = assertError;
window.panic = throwError;
