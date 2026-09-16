import { manifestByTerm, manifestTermIds } from '@fpx/exercises/manifest';
import { categories, categoriesById, termsById, type Category } from './data';

/**
 * The order to learn these in.
 *
 * It is deliberately NOT derived from the graph. The graph's `core` links say "related to",
 * not "depends on", and their direction is whichever way the upstream README happened to
 * cross-reference. Ask that structure for concepts with no prerequisites and it offers
 * comonad, hylomorphism, and kleisli-composition, which are not places to start.
 *
 * The real order lives in `packages/exercises`, as the order its sets are registered in:
 * Core Functions, Composition & Flow, Purity & Reasoning, Types & Data Modeling, Algebraic
 * Structures, Category & Morphisms. The last two generalize the two before them, so meeting
 * Functor before Option means meeting the abstraction before the thing it abstracts.
 */

/** Category ids, ordered by where their first exercise falls in the curriculum. */
export const curriculumCategoryIds: string[] = (() => {
  const ordered: string[] = [];
  for (const termId of manifestTermIds) {
    const category = termsById.get(termId)?.category;
    if (category && !ordered.includes(category)) ordered.push(category);
  }
  // A category with no exercises still has terms worth reading, so keep it, at the end.
  for (const c of categories) if (!ordered.includes(c.id)) ordered.push(c.id);
  return ordered;
})();

export const curriculumCategories: Category[] = curriculumCategoryIds
  .map((id) => categoriesById.get(id))
  .filter((c): c is Category => c !== undefined);

/**
 * The next concept worth opening after this one.
 *
 * Walks the curriculum from just after the current concept and takes the first with rungs
 * left, wrapping once to pick up anything skipped along the way. Following the graph instead
 * would offer whatever happens to be adjacent, which can be several categories deeper.
 */
export function nextConcept(
  afterTermId: string | null,
  hasUnfinishedRungs: (termId: string) => boolean,
): { id: string; title: string } | null {
  const ids = manifestTermIds;
  if (ids.length === 0) return null;

  const from = afterTermId ? ids.indexOf(afterTermId) : -1;
  // Start after the current one; a term with no exercises starts from the beginning.
  for (let step = 1; step <= ids.length; step++) {
    const candidate = ids[(from + step + ids.length) % ids.length]!;
    if (candidate !== afterTermId && hasUnfinishedRungs(candidate)) {
      const term = termsById.get(candidate);
      if (term) return { id: candidate, title: term.title };
    }
  }
  return null;
}

/** Where a concept sits in the curriculum, for "3 of 73" style readouts. */
export const curriculumPosition = (termId: string): number | null => {
  const i = manifestTermIds.indexOf(termId);
  return i === -1 ? null : i + 1;
};

export const curriculumSize = manifestTermIds.length;

export const hasExercises = (termId: string): boolean => termId in manifestByTerm;
