import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@fpx/engine/worker-scope': resolve(__dirname, 'packages/engine/src/worker-scope.ts'),
      '@fpx/engine': resolve(__dirname, 'packages/engine/src/index.ts'),
      '@fpx/exercises': resolve(__dirname, 'packages/exercises/src/index.ts'),
      '@fpx/editor': resolve(__dirname, 'packages/editor/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['packages/**/*.test.ts', 'apps/**/src/**/*.test.ts'],
  },
});
