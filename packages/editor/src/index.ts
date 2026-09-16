import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completeFromList,
  type CompletionSource,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { bracketMatching, indentOnInput, indentUnit } from '@codemirror/language';
import { lintGutter, linter, type Diagnostic } from '@codemirror/lint';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder as placeholderExt,
} from '@codemirror/view';
import { parse } from 'acorn';
import { themeExtension } from './theme.js';

export { editorTheme, themeExtension } from './theme.js';
export { highlightStyle } from './highlight.js';

const JS_KEYWORDS = [
  'const', 'let', 'return', 'function', 'if', 'else', 'for', 'of', 'in', 'while',
  'true', 'false', 'null', 'undefined', 'typeof', 'new', 'class', 'this', 'try',
  'catch', 'throw', 'switch', 'case', 'default', 'break', 'continue', 'delete',
];

/**
 * Reports a syntax error where it actually is.
 *
 * acorn gives a character offset, which is what CodeMirror wants, so the squiggle
 * lands on the broken token rather than the whole line.
 */
export function acornLinter(): Extension {
  return linter(
    (view): Diagnostic[] => {
      const src = view.state.doc.toString();
      if (!src.trim()) return [];
      try {
        parse(src, { ecmaVersion: 'latest', sourceType: 'script' });
        return [];
      } catch (e) {
        const err = e as Error & { pos?: number; raisedAt?: number };
        const from = Math.min(err.pos ?? 0, src.length);
        const to = Math.min(Math.max(err.raisedAt ?? from + 1, from + 1), src.length);
        return [
          {
            from,
            to,
            severity: 'error',
            // acorn appends "(1:12)". The position is already in the gutter.
            message: err.message.replace(/\s*\(\d+:\d+\)\s*$/, ''),
          },
        ];
      }
    },
    { delay: 200 },
  );
}

/** Completes the rung's own bindings and JS keywords. No type-aware completion in v1. */
function scopeCompletions(names: string[]): CompletionSource {
  return completeFromList([
    ...names.map((label) => ({ label, type: 'variable' as const, boost: 1 })),
    ...JS_KEYWORDS.map((label) => ({ label, type: 'keyword' as const })),
  ]);
}

export interface CreateEditorOptions {
  parent: HTMLElement;
  doc: string;
  /** Identifiers offered by autocomplete: the rung's exports plus any helpers it gives. */
  scope?: string[];
  /** Cmd/Ctrl+Enter. */
  onRun?: () => void;
  onChange?: (doc: string) => void;
  /** Named on the editor for screen readers, e.g. "Write curry2". */
  ariaLabel?: string;
  placeholder?: string;
  readOnly?: boolean;
}

export interface EditorHandle {
  view: EditorView;
  getDoc(): string;
  setDoc(next: string): void;
  focus(): void;
  /** Swaps the scope completions without rebuilding the editor. */
  setScope(names: string[]): void;
  destroy(): void;
}

/**
 * Extensions are composed by hand rather than pulled from `basicSetup`, so the bundle
 * carries only what this app uses and the look matches the rest of the site.
 */
export function createEditor(opts: CreateEditorOptions): EditorHandle {
  const scopeCompartment = new Compartment();
  const editableCompartment = new Compartment();

  const extensions: Extension[] = [
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    history(),
    drawSelection(),
    bracketMatching(),
    closeBrackets(),
    indentOnInput(),
    indentUnit.of('  '),
    javascript(),
    themeExtension,
    acornLinter(),
    lintGutter(),
    EditorView.lineWrapping,
    scopeCompartment.of(autocompletion({ override: [scopeCompletions(opts.scope ?? [])] })),
    editableCompartment.of(EditorView.editable.of(!opts.readOnly)),
    EditorState.readOnly.of(!!opts.readOnly),
    EditorView.contentAttributes.of({
      'aria-label': opts.ariaLabel ?? 'Exercise code',
      'aria-describedby': 'practice-results',
    }),
    keymap.of([
      {
        key: 'Mod-Enter',
        preventDefault: true,
        run: () => {
          opts.onRun?.();
          return true;
        },
      },
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...historyKeymap,
      indentWithTab,
    ]),
    EditorView.updateListener.of((u) => {
      if (u.docChanged) opts.onChange?.(u.state.doc.toString());
    }),
  ];

  if (opts.placeholder) extensions.push(placeholderExt(opts.placeholder));

  const view = new EditorView({
    parent: opts.parent,
    state: EditorState.create({ doc: opts.doc, extensions }),
  });

  return {
    view,
    getDoc: () => view.state.doc.toString(),
    setDoc(next) {
      if (next === view.state.doc.toString()) return;
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
    },
    focus: () => view.focus(),
    setScope(names) {
      view.dispatch({
        effects: scopeCompartment.reconfigure(autocompletion({ override: [scopeCompletions(names)] })),
      });
    },
    destroy: () => view.destroy(),
  };
}
