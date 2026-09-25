import { conjugationConfigFor } from '../constants/conjugation';
import type { Conjugations, Person } from '../types/conjugations';
import type { VocabWord } from '../types/vocabWord';

/**
 * Whether a word belongs in the Conjugation Drill and gets a Conjugate
 * pill. The one gate for both, so they can't disagree:
 *
 *   - it has conjugations (set only by generate-conjugations' detection,
 *     never by hand -- part_of_speech alone says nothing, since most verbs
 *     were saved without a type);
 *   - it isn't typed as something else. Re-typing a word away from 'verb' in
 *     Edit Word doesn't delete its stored table (the generator leaves
 *     non-verb-typed words alone); it's filtered out here instead, so
 *     flipping the type back restores it instantly with no regeneration;
 *   - its language has a drill config.
 */
export function isConjugatable(
  word: VocabWord,
): word is VocabWord & { conjugations: Conjugations } {
  // `?? null`: vocabulary cached in localStorage before migration 016 has no field at all.
  const conjugations = word.conjugations ?? null;
  if (!conjugations || !conjugations.tenses) return false;
  if (word.partOfSpeech != null && word.partOfSpeech !== 'verb') return false;
  return conjugationConfigFor(word.languageId) !== null;
}

/** All accepted forms for one cell, canonical first; empty if the verb has none. */
export function formsFor(conjugations: Conjugations, tense: string, person: Person): string[] {
  const forms = conjugations.tenses[tense]?.[person];
  if (forms == null) return [];
  return Array.isArray(forms) ? forms : [forms];
}
