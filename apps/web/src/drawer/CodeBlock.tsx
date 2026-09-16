import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { parser } from '@lezer/javascript';
import { highlightTree, tagHighlighter, tags as t } from '@lezer/highlight';

/**
 * A read-only code block for the Learn tab.
 *
 * It highlights straight off the lezer JavaScript parser and maps tags to plain CSS classes,
 * rather than going through CodeMirror's HighlightStyle. Two reasons: @codemirror/language
 * drags @codemirror/view and the rest of the editor into the initial bundle, and the classes
 * here read the same `--tok-*` tokens the editor theme does, so both stay one palette.
 */

const HIGHLIGHTER = tagHighlighter([
  { tag: [t.keyword, t.operatorKeyword, t.definitionKeyword, t.modifier, t.moduleKeyword], class: 'tok-kw' },
  {
    tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.variableName), t.className],
    class: 'tok-fn',
  },
  { tag: [t.string, t.special(t.string), t.regexp], class: 'tok-str' },
  { tag: [t.number, t.bool, t.null, t.atom], class: 'tok-num' },
  { tag: [t.comment, t.lineComment, t.blockComment], class: 'tok-com' },
  { tag: [t.punctuation, t.separator, t.bracket, t.paren, t.brace, t.squareBracket], class: 'tok-punc' },
  { tag: [t.operator], class: 'tok-op' },
  { tag: [t.typeName, t.namespace], class: 'tok-fn' },
  { tag: [t.invalid], class: 'tok-bad' },
]);

interface Token {
  text: string;
  cls: string | null;
}

function tokenize(code: string): Token[] {
  const tree = parser.parse(code);
  const out: Token[] = [];
  let pos = 0;
  highlightTree(tree, HIGHLIGHTER, (from, to, classes) => {
    if (from > pos) out.push({ text: code.slice(pos, from), cls: null });
    out.push({ text: code.slice(from, to), cls: classes });
    pos = to;
  });
  if (pos < code.length) out.push({ text: code.slice(pos), cls: null });
  return out;
}

/** Splits highlighted tokens back into lines, so each gets its own gutter number. */
function toLines(tokens: Token[]): Token[][] {
  const lines: Token[][] = [[]];
  for (const tok of tokens) {
    const pieces = tok.text.split('\n');
    pieces.forEach((piece, i) => {
      if (i > 0) lines.push([]);
      if (piece) lines[lines.length - 1]!.push({ text: piece, cls: tok.cls });
    });
  }
  return lines;
}

export function CodeBlock({ code, lang = 'js' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const lines = useMemo(() => {
    try {
      return toLines(tokenize(code));
    } catch {
      // A snippet the JS grammar cannot parse still deserves to render, just unhighlighted.
      return code.split('\n').map((l) => [{ text: l, cls: null }]);
    }
  }, [code]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard denied. The code is on screen and selectable either way.
    }
  };

  return (
    <div className="code-block">
      <div className="code-block-head">
        <span className="code-lang">{lang.toUpperCase()}</span>
        <button type="button" className="ghost-btn tiny" onClick={copy}>
          {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre>
        <code>
          {lines.map((line, i) => (
            <span className="code-line" key={i}>
              <span className="code-gutter" aria-hidden>
                {i + 1}
              </span>
              <span className="code-text">
                {line.length === 0 ? ' ' : null}
                {line.map((tok, j) =>
                  tok.cls ? (
                    <span className={tok.cls} key={j}>
                      {tok.text}
                    </span>
                  ) : (
                    <span key={j}>{tok.text}</span>
                  ),
                )}
              </span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
