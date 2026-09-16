import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@fpx/engine/laws': resolve(__dirname, 'packages/engine/src/laws.ts'),
      '@fpx/engine/runner': resolve(__dirname, 'packages/engine/src/runner.ts'),
      '@fpx/engine/types': resolve(__dirname, 'packages/engine/src/types.ts'),
      '@fpx/engine/worker-scope': resolve(__dirname, 'packages/engine/src/worker-scope.ts'),
      '@fpx/engine': resolve(__dirname, 'packages/engine/src/index.ts'),
      '@fpx/exercises': resolve(__dirname, 'packages/exercises/src/index.ts'),
      '@fpx/editor/highlight': resolve(__dirname, 'packages/editor/src/highlight.ts'),
      '@fpx/editor': resolve(__dirname, 'packages/editor/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['packages/**/*.test.ts', 'apps/**/src/**/*.test.ts'],
  },
});
