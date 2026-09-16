import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const pkg = (name: string, file = 'src/index.ts') => resolve(__dirname, `../../packages/${name}/${file}`);

export default defineConfig({
  plugins: [react()],
  // Hash routing, so this deploys to a subpath without server config.
  base: './',
  resolve: {
    alias: {
      // The workspace packages ship TypeScript source. Vite compiles them with the app,
      // which keeps the dev loop to one build and means no package needs a build step.
      '@fpx/engine/laws': pkg('engine', 'src/laws.ts'),
      '@fpx/engine/runner': pkg('engine', 'src/runner.ts'),
      '@fpx/engine/types': pkg('engine', 'src/types.ts'),
      '@fpx/engine/worker-scope': pkg('engine', 'src/worker-scope.ts'),
      '@fpx/engine': pkg('engine'),
      '@fpx/editor/highlight': pkg('editor', 'src/highlight.ts'),
      '@fpx/editor': pkg('editor'),
      '@fpx/exercises/manifest': pkg('exercises', 'src/manifest.ts'),
      '@fpx/exercises/notes': pkg('exercises', 'src/notes.ts'),
      '@fpx/exercises/worker': pkg('exercises', 'src/check.worker.ts'),
      '@fpx/exercises': pkg('exercises'),
      '@fpx/practice-react': pkg('practice-react'),
    },
  },
  server: { port: 5178 },
  build: { target: 'es2022', sourcemap: true },
});
