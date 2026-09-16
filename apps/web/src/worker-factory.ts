/**
 * Building the worker is the host app's job, because bundling it is a Vite concern and the
 * engine and exercises packages stay framework-free and bundler-free.
 *
 * Vite rewrites this `new URL(..., import.meta.url)` at build time and emits the worker as
 * its own chunk, so the Learn view never downloads the grading code.
 */
export const createCheckWorker = (): Worker =>
  new Worker(new URL('@fpx/exercises/worker', import.meta.url), { type: 'module' });
