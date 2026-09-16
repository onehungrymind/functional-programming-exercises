/**
 * Progress lives in one localStorage key, and every access is wrapped, because a browser
 * in private mode throws on write and losing progress is better than a blank page.
 *
 * The store emits changes so the graph arcs and the practice panel stay in step without
 * either one knowing about the other.
 */

const KEY = 'fpx-progress-v1';

export interface ProgressState {
  version: 1;
  /** `${termId}/${rungId}` -> ISO timestamp. */
  done: Record<string, string>;
  /** `${termId}/${rungId}` -> the learner's in-flight code. */
  drafts: Record<string, string>;
  /** `${termId}/${rungId}` -> the option indices they picked. */
  choices: Record<string, number[]>;
}

const empty = (): ProgressState => ({ version: 1, done: {}, drafts: {}, choices: {} });

function read(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    if (parsed.version !== 1) return empty();
    return {
      version: 1,
      done: parsed.done ?? {},
      drafts: parsed.drafts ?? {},
      choices: parsed.choices ?? {},
    };
  } catch {
    return empty();
  }
}

export const rungKey = (termId: string, rungId: string) => `${termId}/${rungId}`;

class ProgressStore {
  #state: ProgressState = read();
  #listeners = new Set<() => void>();

  #commit() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.#state));
    } catch {
      // Out of quota or blocked. The in-memory state is still correct for this session.
    }
    for (const l of this.#listeners) l();
  }

  subscribe = (fn: () => void) => {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  };

  /** Identity-stable between commits, so useSyncExternalStore does not loop. */
  getSnapshot = () => this.#state;

  isDone = (termId: string, rungId: string) => rungKey(termId, rungId) in this.#state.done;

  markDone(termId: string, rungId: string) {
    const k = rungKey(termId, rungId);
    if (k in this.#state.done) return;
    this.#state = { ...this.#state, done: { ...this.#state.done, [k]: new Date().toISOString() } };
    this.#commit();
  }

  getDraft = (termId: string, rungId: string) => this.#state.drafts[rungKey(termId, rungId)];

  setDraft(termId: string, rungId: string, code: string) {
    const k = rungKey(termId, rungId);
    if (this.#state.drafts[k] === code) return;
    this.#state = { ...this.#state, drafts: { ...this.#state.drafts, [k]: code } };
    this.#commit();
  }

  clearDraft(termId: string, rungId: string) {
    const k = rungKey(termId, rungId);
    if (!(k in this.#state.drafts)) return;
    const drafts = { ...this.#state.drafts };
    delete drafts[k];
    this.#state = { ...this.#state, drafts };
    this.#commit();
  }

  getChoice = (termId: string, rungId: string) => this.#state.choices[rungKey(termId, rungId)];

  setChoice(termId: string, rungId: string, picked: number[]) {
    const k = rungKey(termId, rungId);
    this.#state = { ...this.#state, choices: { ...this.#state.choices, [k]: picked } };
    this.#commit();
  }

  /** Cheap insurance against a cleared browser. */
  export(): string {
    return JSON.stringify(this.#state, null, 2);
  }

  import(json: string): { ok: true } | { ok: false; error: string } {
    try {
      const parsed = JSON.parse(json) as Partial<ProgressState>;
      if (parsed.version !== 1) return { ok: false, error: 'That file is not a version 1 progress export.' };
      this.#state = {
        version: 1,
        done: parsed.done ?? {},
        drafts: parsed.drafts ?? {},
        choices: parsed.choices ?? {},
      };
      this.#commit();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: `That file could not be read: ${(e as Error).message}` };
    }
  }

  reset() {
    this.#state = empty();
    this.#commit();
  }
}

export const progress = new ProgressStore();
