import { Marked } from 'marked';
import { termsById } from '../data';

/**
 * Markdown for the Learn tab.
 *
 * Two things differ from a stock renderer. An internal `#term` link is tagged so the app can
 * route it instead of jumping the page, and fenced code is pulled out beforehand so it can be
 * rendered by CodeBlock rather than by marked.
 */

/** Shared link handling: an internal `#term` link is routed rather than followed. */
const renderer = {
  link({ href, text }: { href?: string | null; text: string }) {
    if (href?.startsWith('#')) {
      const id = href.slice(1).toLowerCase();
      // Only route links that actually go somewhere in this app.
      if (termsById.has(id)) {
        return `<a href="#/term/${id}" data-term-id="${id}" class="term-link">${text}</a>`;
      }
      return `<span>${text}</span>`;
    }
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  },
};

/**
 * Upstream's bodies rely on single newlines being real line breaks, so `breaks` stays on
 * for them.
 */
const marked = new Marked({ gfm: true, breaks: true, renderer });

/**
 * Notes are ours, written as ordinary markdown, so a wrapped source line is just a wrapped
 * source line. Leaving `breaks` on here would turn every one into a `<br>` and chop
 * sentences in half.
 */
const markedNotes = new Marked({ gfm: true, breaks: false, renderer });

export type BodyPart = { type: 'markdown'; html: string } | { type: 'code'; lang: string; code: string };

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Splits a term's body into prose and code, keeping their original order so the
 * explanation and the example it belongs to stay together.
 *
 * `skipOpening` drops a first paragraph that only repeats text already on screen. Upstream
 * bodies open by restating their own summary in 44 of the 75 entries, which reads as an
 * editing mistake once the page is one continuous piece rather than labelled sections.
 */
export function parseBody(body: string, md: Marked = marked, skipOpening?: string): BodyPart[] {
  // Upstream repeats further reading at the end of the body. The drawer has its own section.
  let clean = body.replace(/\n*__Further reading[\s\S]*$/i, '').trim();

  if (skipOpening) {
    const [first, ...rest] = clean.split(/\n\s*\n/);
    if (first && normalize(first) === normalize(skipOpening)) clean = rest.join('\n\n').trim();
  }

  const parts: BodyPart[] = [];
  const fence = /```([a-z]*)\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = fence.exec(clean)) !== null) {
    const before = clean.slice(last, m.index).trim();
    if (before) parts.push({ type: 'markdown', html: md.parse(before) as string });
    parts.push({ type: 'code', lang: m[1] || 'js', code: m[2]!.trim() });
    last = fence.lastIndex;
  }

  const tail = clean.slice(last).trim();
  if (tail) parts.push({ type: 'markdown', html: md.parse(tail) as string });
  return parts;
}

export const renderInline = (md: string): string => marked.parse(md) as string;

/** Notes written by this repo, as opposed to the upstream body. */
export const parseNotes = (notes: string): BodyPart[] => parseBody(notes, markedNotes);
