import childProcess from 'child_process';
import path from 'path';
import {defineConfig} from 'vite';

const commitHash = childProcess.execSync('git rev-parse --short HEAD').toString();

export default defineConfig({
    define: {
        COMMIT_HASH: JSON.stringify(commitHash),
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
