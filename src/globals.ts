import {assert, assertError, throwError} from '#/utils';
import {logger} from '#/logger';

let BROWSER = true;
if (!globalThis.window) {
    // HACK: make `window` global available in tests
    (globalThis as any).window = globalThis;
    BROWSER = false;
}
window.__DEV_MODE = !!window.__DEV_MODE;
window.assert = assert;
window.assertError = assertError;
window.panic = throwError;
window.logger = logger;
window.BROWSER = BROWSER;
