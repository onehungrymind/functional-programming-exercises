import { describe, expect, it } from 'vitest';
import { manifestTermIds } from '@fpx/exercises/manifest';
import { curriculumCategoryIds, nextConcept } from './curriculum';
import { termsById } from './data';

describe('curriculum order', () => {
  it('runs the six categories in learning order, not the snapshot order', () => {
    // The snapshot lists Category & Morphisms fourth. It belongs last, because it
    // generalizes what comes before it.
    expect(curriculumCategoryIds).toEqual([
      'core-functions',
      'composition',
      'purity-state',
      'types-data',
      'algebraic-structures',
      'category-morphisms',
    ]);
  });

  it('puts the abstractions after the things they abstract', () => {
    const at = (id: string) => curriculumCategoryIds.indexOf(id);
    // Option and Either before Functor and Monad.
    expect(at('types-data')).toBeLessThan(at('algebraic-structures'));
    // And the theory last of all.
    expect(at('algebraic-structures')).toBeLessThan(at('category-morphisms'));
  });

  it('covers every category exactly once', () => {
    expect(new Set(curriculumCategoryIds).size).toBe(curriculumCategoryIds.length);
    expect(curriculumCategoryIds).toHaveLength(6);
  });

  it('starts where a beginner should start', () => {
    expect(manifestTermIds[0]).toBe('function');
    // The whole of Core Functions comes before anything else.
    const core = manifestTermIds.slice(0, 11);
    expect(core).toContain('pure-function');
    expect(core.every((id) => termsById.get(id)!.category === 'core-functions')).toBe(true);
  });
});

describe('nextConcept', () => {
  const nothingDone = () => true;

  it('offers the following concept in curriculum order', () => {
    const i = manifestTermIds.indexOf('arity');
    expect(nextConcept('arity', nothingDone)?.id).toBe(manifestTermIds[i + 1]);
  });

  it('never offers the concept you are already on', () => {
    for (const id of manifestTermIds.slice(0, 12)) {
      expect(nextConcept(id, nothingDone)?.id).not.toBe(id);
    }
  });

  it('skips concepts that are already finished', () => {
    const i = manifestTermIds.indexOf('function');
    const nextTwo = [manifestTermIds[i + 1]!, manifestTermIds[i + 2]!];
    const unfinished = (id: string) => !nextTwo.includes(id);
    expect(nextConcept('function', unfinished)?.id).toBe(manifestTermIds[i + 3]);
  });

  it('wraps to pick up something skipped earlier', () => {
    const last = manifestTermIds[manifestTermIds.length - 1]!;
    const onlyFirst = (id: string) => id === manifestTermIds[0];
    expect(nextConcept(last, onlyFirst)?.id).toBe(manifestTermIds[0]);
  });

  it('gives up rather than looping when everything is done', () => {
    expect(nextConcept('function', () => false)).toBeNull();
  });

  it('starts from the beginning for a term with no exercises', () => {
    expect(nextConcept('dealing-with-partial-functions', nothingDone)?.id).toBe(manifestTermIds[0]);
  });

  it('does not follow graph adjacency, which would jump categories', () => {
    // Currying links to Kleisli Composition in the graph. That is several categories deeper
    // and is exactly the jump this replaced.
    const next = nextConcept('currying', nothingDone);
    expect(next?.id).not.toBe('kleisli-composition');
    const curryingCategory = termsById.get('currying')!.category;
    const nextCategory = termsById.get(next!.id)!.category;
    const distance = curriculumCategoryIds.indexOf(nextCategory) - curriculumCategoryIds.indexOf(curryingCategory);
    expect(distance).toBeLessThanOrEqual(1);
  });

  it('only ever offers a concept that has exercises', () => {
    const withExercises = new Set(manifestTermIds);
    for (const id of manifestTermIds) {
      const next = nextConcept(id, nothingDone);
      expect(withExercises.has(next!.id)).toBe(true);
    }
  });
});
