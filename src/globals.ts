import {logger} from '#/common/logger';
import {assert, assertError, throwError} from '#/utils';

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
window.COMMIT_HASH = window.COMMIT_HASH || 'unknown';
window.GAME_VERSION = window.GAME_VERSION || '0.0.0';
