import { useEffect, useState } from 'react';
import * as vocabularyApi from '../lib/vocabularyApi';
import { conjugationConfigFor } from '../constants/conjugation';
import { isConjugatable } from '../utils/conjugationForms';
import type { Conjugations } from '../types/conjugations';
import type { LanguageId } from '../types/models';
import type { VocabWord } from '../types/vocabWord';

export type DrillWord = VocabWord & { conjugations: Conjugations };

/**
 * The Conjugation Drill's verb pool: every word in the language that
 * passes isConjugatable (src/utils/conjugationForms.ts). Fetched fresh each
 * time the Practice tab mounts -- reusing vocabularyApi.fetchVocabulary,
 * same as usePracticeSession's distractor pool -- so a verb added in
 * Families shows up here as soon as generate-conjugations has run for it,
 * with no manual step. Languages without a drill config never fetch.
 */
export function useConjugationPool(languageId: LanguageId | null) {
  const supported = conjugationConfigFor(languageId) !== null;
  const [verbs, setVerbs] = useState<DrillWord[]>([]);
  const [loading, setLoading] = useState(supported);

  // Reset during render rather than in an effect, so a language switch clears
  // the stale pool in the same pass instead of flashing it for a frame.
  const [syncedLanguageId, setSyncedLanguageId] = useState(languageId);
  if (languageId !== syncedLanguageId) {
    setSyncedLanguageId(languageId);
    setVerbs([]);
    setLoading(supported);
  }

  useEffect(() => {
    if (!languageId || !supported) return;

    let cancelled = false;
    vocabularyApi
      .fetchVocabulary(languageId)
      .then((snapshot) => {
        if (!cancelled) setVerbs(snapshot.words.filter(isConjugatable));
      })
      .catch((error) => {
        console.error('Error loading conjugation drill verbs:', error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [languageId, supported]);

  return { verbs, loading };
}
