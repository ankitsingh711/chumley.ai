/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json-summary', 'lcov'],
            exclude: ['node_modules/', 'dist/', '.eslintrc.cjs', 'vite.config.ts', 'vitest.config.ts', 'postcss.config.js', 'tailwind.config.js'],
        },
    },
});
