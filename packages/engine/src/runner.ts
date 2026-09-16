import type { RunRequest, RunResult } from './types.js';

const DEFAULT_TIMEOUT_MS = 1500;

export interface RunnerOptions {
  /** Makes a fresh worker. Called on start, and again after every timeout. */
  createWorker: () => Worker;
  defaultTimeoutMs?: number;
  /**
   * Keep a spare worker warm so the run after a timeout does not pay for a cold start.
   * Costs one idle worker. Worth it: a timeout is exactly when the learner is already waiting.
   */
  prewarm?: boolean;
}

export interface RunOptions {
  termId: string;
  rungId: string;
  code: string;
  timeoutMs?: number;
}

/**
 * Owns the worker and the sequence number.
 *
 * Two things matter here and nothing else does:
 * a run that outlives its request is dropped, and a run that hangs is killed.
 */
export class CheckRunner {
  #opts: RunnerOptions;
  #worker: Worker | null = null;
  #spare: Worker | null = null;
  #seq = 0;
  #pending: {
    seq: number;
    timer: ReturnType<typeof setTimeout>;
    startedAt: number;
    resolve: (r: RunResult) => void;
  } | null = null;

  constructor(opts: RunnerOptions) {
    this.#opts = opts;
  }

  /** Called ahead of the first run so the first keystroke does not pay for worker startup. */
  warmUp(): void {
    if (!this.#worker) this.#worker = this.#spawn();
    if (this.#opts.prewarm && !this.#spare) this.#spare = this.#opts.createWorker();
  }

  #spawn(): Worker {
    // A spare that was warmed earlier becomes the live worker, and a new spare replaces it.
    const w = this.#spare ?? this.#opts.createWorker();
    this.#spare = this.#opts.prewarm ? this.#opts.createWorker() : null;

    w.onmessage = (event: MessageEvent<RunResult>) => this.#receive(event.data);
    w.onerror = (event) => {
      event.preventDefault?.();
      this.#settle({
        seq: this.#pending?.seq ?? this.#seq,
        results: [],
        logs: [],
        fatal: (event as ErrorEvent).message || 'The sandbox stopped unexpectedly.',
      });
      // The worker is in an unknown state now, so it does not get another run.
      this.#recycle();
    };
    return w;
  }

  #receive(result: RunResult): void {
    // A reply for a run the learner has already typed past is not interesting.
    if (!this.#pending || result.seq !== this.#pending.seq) return;
    this.#settle(result);
  }

  #settle(result: RunResult): void {
    const p = this.#pending;
    if (!p) return;
    clearTimeout(p.timer);
    this.#pending = null;
    p.resolve({ ...result, elapsedMs: Math.round(performance.now() - p.startedAt) });
  }

  #recycle(): void {
    this.#worker?.terminate();
    this.#worker = null;
  }

  /**
   * Runs a rung's checks. A newer call supersedes an older one: the older promise still
   * resolves, but with a result the caller will discard by sequence number.
   */
  run({ termId, rungId, code, timeoutMs }: RunOptions): Promise<RunResult> {
    const seq = ++this.#seq;

    // Whatever was in flight is stale now. Resolve it so nothing awaits forever.
    if (this.#pending) {
      const stale = this.#pending;
      clearTimeout(stale.timer);
      this.#pending = null;
      stale.resolve({ seq: stale.seq, results: [], logs: [], fatal: undefined });
    }

    if (!this.#worker) this.#worker = this.#spawn();
    const worker = this.#worker;
    const limit = timeoutMs ?? this.#opts.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;

    return new Promise<RunResult>((resolve) => {
      const timer = setTimeout(() => {
        this.#pending = null;
        // The worker is stuck in learner code and will never answer. Kill it.
        worker.terminate();
        if (this.#worker === worker) this.#worker = null;
        resolve({
          seq,
          results: [],
          logs: [],
          fatal: `Your code did not finish in ${limit}ms. That usually means a loop or a recursion with no way out.`,
          elapsedMs: limit,
        });
      }, limit);

      this.#pending = { seq, timer, startedAt: performance.now(), resolve };

      const request: RunRequest = { seq, termId, rungId, code };
      worker.postMessage(request);
    });
  }

  /** The current sequence number, so a caller can drop a result it no longer wants. */
  get currentSeq(): number {
    return this.#seq;
  }

  dispose(): void {
    if (this.#pending) clearTimeout(this.#pending.timer);
    this.#pending = null;
    this.#worker?.terminate();
    this.#spare?.terminate();
    this.#worker = null;
    this.#spare = null;
  }
}
