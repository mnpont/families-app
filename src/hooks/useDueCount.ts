import { useEffect, useState } from 'react';
import * as vocabularyApi from '../lib/vocabularyApi';
import type { LanguageId } from '../types/models';

/**
 * How many cards a review session would serve right now -- the "12 due"
 * pill on the hub's Multiple Choice entry. Read-only: the same
 * fetchReviewSession query Multiple Choice itself runs when launched, only
 * counted. null until known (or on failure), so the hub shows no pill
 * rather than a wrong one.
 */
export function useDueCount(languageId: LanguageId | null): number | null {
  const [count, setCount] = useState<number | null>(null);

  const [syncedLanguageId, setSyncedLanguageId] = useState(languageId);
  if (languageId !== syncedLanguageId) {
    setSyncedLanguageId(languageId);
    setCount(null);
  }

  useEffect(() => {
    if (!languageId) return;
    let cancelled = false;
    vocabularyApi
      .fetchReviewSession(languageId)
      .then((cards) => {
        if (!cancelled) setCount(cards.length);
      })
      .catch((error) => {
        console.error('Error counting due cards:', error);
      });
    return () => {
      cancelled = true;
    };
  }, [languageId]);

  return count;
}
