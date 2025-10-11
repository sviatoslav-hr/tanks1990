import childProcess from 'child_process';
import path from 'path';
import {defineConfig} from 'vite';
import pkg from '../package.json' with {type: 'json'};

const commitHash = childProcess.execSync('git rev-parse --short HEAD').toString().trim();

export default defineConfig({
    define: {
        COMMIT_HASH: JSON.stringify(commitHash),
        GAME_VERSION: JSON.stringify(pkg.version),
    },
    resolve: {
        alias: {
            '#': path.resolve(__dirname, '../src'),
        },
    },
    esbuild: {
        target: 'es2023',
    },
});
