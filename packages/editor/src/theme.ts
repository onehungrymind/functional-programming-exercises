import { syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { highlightStyle } from './highlight.js';

/**
 * Everything here reads from the CSS custom properties the shell defines, so the editor
 * follows the theme without a second source of truth. Switching themes reconfigures a
 * compartment; nothing here is rebuilt and the editor is never remounted.
 *
 * Token colors mirror upstream's Prism palette (app/src/index.css) so a code block in Learn
 * and the same code in Practice are the same colors.
 */

export const editorTheme = EditorView.theme({
  '&': {
    color: 'var(--text)',
    backgroundColor: 'var(--card)',
    fontSize: '12.5px',
    border: '1px solid var(--line)',
  },
  '&.cm-focused': {
    outline: 'none',
    borderColor: 'var(--line2)',
  },
  '.cm-content': {
    fontFamily: 'var(--mono)',
    padding: '10px 0',
    caretColor: 'var(--text)',
    lineHeight: '1.6',
  },
  '.cm-scroller': {
    fontFamily: 'var(--mono)',
    lineHeight: '1.6',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--faint)',
    border: 'none',
    paddingRight: '4px',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 8px 0 12px',
    minWidth: '2.4em',
  },
  '.cm-activeLine': { backgroundColor: 'var(--card2)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--muted)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--text)', borderLeftWidth: '2px' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'var(--sel)',
  },
  '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
    backgroundColor: 'var(--sel)',
    outline: '1px solid var(--line2)',
  },
  '.cm-nonmatchingBracket': { color: 'var(--no)' },
  '.cm-selectionMatch': { backgroundColor: 'var(--sel)' },

  // Lint
  '.cm-lintRange-error': {
    backgroundImage: 'none',
    borderBottom: '2px solid var(--no)',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--panel)',
    border: '1px solid var(--line2)',
    color: 'var(--text)',
    fontFamily: 'var(--mono)',
    fontSize: '11.5px',
    borderRadius: '3px',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--card2)',
    color: 'var(--text)',
  },
  '.cm-diagnostic-error': { borderLeftColor: 'var(--no)' },

  '.cm-placeholder': { color: 'var(--faint)' },
});

export const themeExtension: Extension = [editorTheme, syntaxHighlighting(highlightStyle)];
