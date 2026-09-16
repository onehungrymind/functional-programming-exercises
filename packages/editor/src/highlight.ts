import { HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

/**
 * The token palette, in its own module on purpose.
 *
 * The Learn tab highlights read-only code with the same style the editor uses, but it has
 * no editor. Keeping this separate from theme.ts means importing it does not drag
 * @codemirror/view, autocomplete, and acorn into the initial bundle.
 *
 * Colors mirror upstream's Prism palette (app/src/index.css) through the shared tokens.
 */
export const highlightStyle = HighlightStyle.define([
  { tag: [t.keyword, t.operatorKeyword, t.definitionKeyword, t.modifier, t.moduleKeyword], color: 'var(--tok-kw)', fontWeight: '600' },
  {
    tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.variableName), t.className],
    color: 'var(--tok-fn)',
    fontWeight: '600',
  },
  { tag: [t.string, t.special(t.string), t.regexp], color: 'var(--tok-str)' },
  { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--tok-num)' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--tok-com)', fontStyle: 'italic' },
  { tag: [t.punctuation, t.separator, t.bracket, t.paren, t.brace, t.squareBracket], color: 'var(--tok-punc)' },
  { tag: [t.operator], color: 'var(--tok-op)' },
  { tag: [t.propertyName], color: 'var(--text)' },
  { tag: [t.variableName, t.name], color: 'var(--text)' },
  { tag: [t.typeName, t.namespace], color: 'var(--tok-fn)' },
  { tag: [t.invalid], color: 'var(--no)' },
]);
