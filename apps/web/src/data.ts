import snapshot from '../../../data/jargons.json';
import source from '../../../data/source.json';

/**
 * The committed snapshot is the only thing this app knows about upstream.
 * Nothing here reaches for the sibling clone, so a fresh checkout builds and runs.
 */

export interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
}

export interface CodeBlock {
  lang: string;
  code: string;
}

export interface Term {
  id: string;
  title: string;
  depth: number;
  category: string;
  /** False for the two structural sections upstream, which never get exercises. */
  isConcept: boolean;
  aliases: string[];
  summary: string;
  body: string;
  codeBlocks: CodeBlock[];
  furtherReading: { title: string; url: string }[];
  crossRefs: string[];
  relatedIds: string[];
}

export interface GraphNode {
  id: string;
  name: string;
  category: string;
  val: number;
}

export interface GraphLink {
  source: string;
  target: string;
  type: 'core' | 'reference';
}

export const meta = snapshot.meta as {
  title: string;
  subtitle: string;
  totalTerms: number;
  totalRelationships: number;
  sourceRepo: string;
  originalAuthor: string;
};

export const categories = snapshot.categories as Category[];
export const terms = snapshot.terms as Term[];
export const graph = snapshot.graph as { nodes: GraphNode[]; links: GraphLink[] };
export const sourceInfo = source as {
  repo: string;
  commit: string;
  syncedAt: string;
  termCount: number;
  conceptCount: number;
  linkCount: number;
};

export const termsById = new Map(terms.map((t) => [t.id, t]));
export const categoriesById = new Map(categories.map((c) => [c.id, c]));

/** Every term directly connected to this one, with the edge type that connects them. */
export const neighborsOf = (id: string): { id: string; type: GraphLink['type'] }[] => {
  const out = new Map<string, GraphLink['type']>();
  for (const l of graph.links) {
    if (l.source === id) out.set(l.target, l.type);
    else if (l.target === id) out.set(l.source, l.type);
  }
  return [...out].map(([tid, type]) => ({ id: tid, type }));
};

export const categoryColor = (categoryId: string): string =>
  categoriesById.get(categoryId)?.color ?? 'var(--accent)';

/** The upstream site's own page for a term, linked from the drawer. */
export const upstreamUrl = (termId: string): string =>
  `https://hemanth.github.io/functional-programming-jargon/#${termId}`;

export const upstreamSourceUrl = `${meta.sourceRepo}/blob/${sourceInfo.commit}/readme.md`;
