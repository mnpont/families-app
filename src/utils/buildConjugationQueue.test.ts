import { describe, expect, it } from 'vitest';
import {
  buildConjugationQueue,
  countCombinations,
  reinsertAfterWrong,
  type DrillItem,
  type DrillVerb,
} from './buildConjugationQueue';
import type { Conjugations } from '../types/conjugations';

const PERSONS = ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles'];

/** Deterministic PRNG (mulberry32), so failures are reproducible. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function verb(id: number, persons: string[] = PERSONS): DrillVerb {
  const table = Object.fromEntries(persons.map((p) => [p, `${p}-form-${id}`]));
  const conjugations: Conjugations = {
    version: 1,
    source: 'lefff',
    infinitive: `verb${id}`,
    pronominal: false,
    hAspire: false,
    auxiliary: 'avoir',
    tenses: { present: table, passe_compose: table },
  };
  return { id, conjugations };
}

const TENSES = ['present', 'passe_compose'];

describe('buildConjugationQueue', () => {
  it('builds a session of the requested size', () => {
    const verbs = [1, 2, 3, 4, 5].map((id) => verb(id));
    const queue = buildConjugationQueue({
      verbs,
      tenses: TENSES,
      persons: PERSONS,
      size: 20,
      random: seeded(1),
    });
    expect(queue).toHaveLength(20);
    expect(queue.map((item) => item.origin)).toEqual([...Array(20).keys()]);
    expect(queue.every((item) => item.retry === 0)).toBe(true);
  });

  it('never repeats a (verb, tense, person) combination', () => {
    const queue = buildConjugationQueue({
      verbs: [verb(1), verb(2)],
      tenses: TENSES,
      persons: PERSONS,
      size: 20,
      random: seeded(2),
    });
    const keys = queue.map((i) => `${i.verbId}|${i.tense}|${i.person}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('is shorter when there are fewer combinations than the session size', () => {
    const verbs = [verb(1, ['je', 'tu'])];
    expect(countCombinations(verbs, ['present'], PERSONS)).toBe(2);
    expect(
      buildConjugationQueue({ verbs, tenses: ['present'], persons: PERSONS, size: 20 }),
    ).toHaveLength(2);
  });

  it('skips persons a verb has no form for', () => {
    const queue = buildConjugationQueue({
      verbs: [verb(1, ['il', 'elle'])],
      tenses: ['present'],
      persons: PERSONS,
      size: 20,
    });
    expect(queue.map((i) => i.person).sort()).toEqual(['elle', 'il']);
  });

  it.each([1, 2, 3, 4, 5, 6, 7, 8])('never asks the same verb twice in a row (seed %i)', (seed) => {
    const queue = buildConjugationQueue({
      verbs: [verb(1), verb(2), verb(3)],
      tenses: TENSES,
      persons: PERSONS,
      size: 20,
      random: seeded(seed),
    });
    for (let i = 1; i < queue.length; i++) {
      expect(queue[i].verbId).not.toBe(queue[i - 1].verbId);
    }
  });

  it('spreads verbs, tenses and persons evenly', () => {
    const queue = buildConjugationQueue({
      verbs: [1, 2, 3, 4].map((id) => verb(id)),
      tenses: TENSES,
      persons: PERSONS,
      size: 16,
      random: seeded(3),
    });
    const count = (key: keyof DrillItem) => {
      const counts = new Map<unknown, number>();
      for (const item of queue) counts.set(item[key], (counts.get(item[key]) ?? 0) + 1);
      return [...counts.values()];
    };
    expect(count('verbId')).toEqual([4, 4, 4, 4]);
    expect(count('tense')).toEqual([8, 8]);
    expect(Math.max(...count('person')) - Math.min(...count('person'))).toBeLessThanOrEqual(1);
  });

  it('allows the same verb back to back only when it is the only verb', () => {
    const queue = buildConjugationQueue({
      verbs: [verb(1)],
      tenses: ['present'],
      persons: PERSONS,
      size: 20,
    });
    expect(queue).toHaveLength(8);
  });
});

describe('reinsertAfterWrong', () => {
  const options = { minOffset: 3, maxOffset: 5, maxRetries: 2 };
  const session = () =>
    buildConjugationQueue({
      verbs: [1, 2, 3, 4, 5].map((id) => verb(id)),
      tenses: TENSES,
      persons: PERSONS,
      size: 20,
      random: seeded(4),
    });

  it('puts a retry 3-5 positions later', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const queue = session();
      const next = reinsertAfterWrong(queue, 2, { ...options, random: seeded(seed) });
      expect(next).toHaveLength(queue.length + 1);
      const position = next.findIndex((item, i) => i > 2 && item.origin === queue[2].origin);
      expect(position - 2).toBeGreaterThanOrEqual(3);
      expect(position - 2).toBeLessThanOrEqual(5);
      expect(next[position].retry).toBe(1);
    }
  });

  it('avoids putting the same verb twice in a row', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const next = reinsertAfterWrong(session(), 5, { ...options, random: seeded(seed) });
      for (let i = 1; i < next.length; i++) {
        expect(next[i].verbId).not.toBe(next[i - 1].verbId);
      }
    }
  });

  it('clamps to the end of the queue', () => {
    const queue = session();
    const next = reinsertAfterWrong(queue, queue.length - 2, options);
    expect(next[next.length - 1].origin).toBe(queue[queue.length - 2].origin);
  });

  it('stops after two retries per question', () => {
    let queue = session();
    queue = reinsertAfterWrong(queue, 0, options);
    const firstRetry = queue.findIndex((item, i) => i > 0 && item.origin === 0);
    queue = reinsertAfterWrong(queue, firstRetry, options);
    const secondRetry = queue.findIndex((item, i) => i > firstRetry && item.origin === 0);
    expect(queue[secondRetry].retry).toBe(2);
    expect(reinsertAfterWrong(queue, secondRetry, options)).toBe(queue);
  });
});
