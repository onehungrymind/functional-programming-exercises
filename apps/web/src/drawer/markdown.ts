import { Marked } from 'marked';
import { termsById } from '../data';

/**
 * Markdown for the Learn tab.
 *
 * Two things differ from a stock renderer. An internal `#term` link is tagged so the app can
 * route it instead of jumping the page, and fenced code is pulled out beforehand so it can be
 * rendered by CodeBlock rather than by marked.
 */

const marked = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    link({ href, text }) {
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
  },
});

export type BodyPart = { type: 'markdown'; html: string } | { type: 'code'; lang: string; code: string };

/**
 * Splits a term's body into prose and code, keeping their original order so the
 * explanation and the example it belongs to stay together.
 */
export function parseBody(body: string): BodyPart[] {
  // Upstream repeats further reading at the end of the body. The drawer has its own section.
  const clean = body.replace(/\n*__Further reading[\s\S]*$/i, '').trim();

  const parts: BodyPart[] = [];
  const fence = /```([a-z]*)\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = fence.exec(clean)) !== null) {
    const before = clean.slice(last, m.index).trim();
    if (before) parts.push({ type: 'markdown', html: marked.parse(before) as string });
    parts.push({ type: 'code', lang: m[1] || 'js', code: m[2]!.trim() });
    last = fence.lastIndex;
  }

  const tail = clean.slice(last).trim();
  if (tail) parts.push({ type: 'markdown', html: marked.parse(tail) as string });
  return parts;
}

export const renderInline = (md: string): string => marked.parse(md) as string;
