import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
    plugins: [solidPlugin()],
    base: '/pipevariabler/',
    build: {
        outDir: 'build',
        target: 'esnext'
    },
    resolve: {
        conditions: ['development', 'browser']
    }
});
