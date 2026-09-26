import type { Conjugations, Person } from '../types/conjugations';
import { formsFor } from './conjugationForms';

/**
 * Builds and maintains a Conjugation Drill session's question order
 * (docs/practice-hub-spec.md "Queue"). Pure, with injectable randomness
 * (`random`, defaulting to Math.random) so tests can pin it.
 *
 * Interleaved, never blocked: verbs, tenses and persons are mixed across
 * the session rather than drilling one verb's table top to bottom --
 * interleaving is what makes each answer a real retrieval rather than a
 * pattern continued from the previous line (docs/learning-science.md).
 */

export interface DrillVerb {
  id: number;
  conjugations: Conjugations;
}

export interface DrillItem {
  verbId: number;
  tense: string;
  person: Person;
  /** Index among the session's original questions -- shared by a question and its retries. */
  origin: number;
  /** 0 for the original question, 1..MAX for a re-inserted retry. */
  retry: number;
}

export type Random = () => number;

interface Combination {
  verbId: number;
  tense: string;
  person: Person;
}

function combinations(verbs: DrillVerb[], tenses: string[], persons: Person[]): Combination[] {
  const all: Combination[] = [];
  for (const verb of verbs) {
    for (const tense of tenses) {
      for (const person of persons) {
        if (formsFor(verb.conjugations, tense, person).length > 0) {
          all.push({ verbId: verb.id, tense, person });
        }
      }
    }
  }
  return all;
}

/** How many distinct questions these settings allow -- the setup sheet's "N questions" is min(this, session size). */
export function countCombinations(verbs: DrillVerb[], tenses: string[], persons: Person[]): number {
  return combinations(verbs, tenses, persons).length;
}

/**
 * Greedy pick, one slot at a time: the remaining combination with the
 * lowest "already used" score wins, so every verb, tense and person gets
 * its turn before any repeats. The same verb is never picked twice in a
 * row (unless it's the only verb left), and repeating the previous
 * person/tense costs extra. A little noise keeps sessions from coming out
 * identical.
 */
export function buildConjugationQueue(options: {
  verbs: DrillVerb[];
  tenses: string[];
  persons: Person[];
  size: number;
  random?: Random;
}): DrillItem[] {
  const { verbs, tenses, persons, size, random = Math.random } = options;
  const remaining = combinations(verbs, tenses, persons);
  const target = Math.min(size, remaining.length);

  const verbUses = new Map<number, number>();
  const tenseUses = new Map<string, number>();
  const personUses = new Map<Person, number>();
  const queue: DrillItem[] = [];

  while (queue.length < target) {
    const previous = queue[queue.length - 1];
    const allowSameVerb =
      previous !== undefined && remaining.every((c) => c.verbId === previous.verbId);

    let bestIndex = -1;
    let bestScore = Infinity;
    remaining.forEach((combination, index) => {
      if (previous && !allowSameVerb && combination.verbId === previous.verbId) return;
      const score =
        (verbUses.get(combination.verbId) ?? 0) * 4 +
        (tenseUses.get(combination.tense) ?? 0) * 2 +
        (personUses.get(combination.person) ?? 0) +
        (previous?.person === combination.person ? 3 : 0) +
        (previous?.tense === combination.tense ? 1 : 0) +
        random() * 1.5;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    const [picked] = remaining.splice(bestIndex, 1);
    verbUses.set(picked.verbId, (verbUses.get(picked.verbId) ?? 0) + 1);
    tenseUses.set(picked.tense, (tenseUses.get(picked.tense) ?? 0) + 1);
    personUses.set(picked.person, (personUses.get(picked.person) ?? 0) + 1);
    queue.push({ ...picked, origin: queue.length, retry: 0 });
  }

  return queue;
}

/**
 * After a wrong answer to queue[index]: returns a new queue with a retry of
 * it `minOffset`..`maxOffset` positions later (clamped to the end), at most
 * `maxRetries` times per question. Offsets are tried in random order and
 * the first that doesn't put the same verb twice in a row wins; if none
 * can avoid it (a short tail, or a single-verb session), the first offset
 * is used anyway. Returns the queue unchanged once the item is out of
 * retries.
 */
export function reinsertAfterWrong(
  queue: DrillItem[],
  index: number,
  options: { minOffset: number; maxOffset: number; maxRetries: number; random?: Random },
): DrillItem[] {
  const { minOffset, maxOffset, maxRetries, random = Math.random } = options;
  const item = queue[index];
  if (!item || item.retry >= maxRetries) return queue;

  const offsets: number[] = [];
  for (let offset = minOffset; offset <= maxOffset; offset++) offsets.push(offset);
  for (let i = offsets.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [offsets[i], offsets[j]] = [offsets[j], offsets[i]];
  }

  const positionFor = (offset: number) => Math.min(index + offset, queue.length);
  const fits = (position: number) =>
    queue[position - 1]?.verbId !== item.verbId && queue[position]?.verbId !== item.verbId;
  const position = positionFor(offsets.find((o) => fits(positionFor(o))) ?? offsets[0]);

  const retry: DrillItem = { ...item, retry: item.retry + 1 };
  return [...queue.slice(0, position), retry, ...queue.slice(position)];
}
