import { useEffect, useState } from 'react';
import * as vocabularyApi from '../lib/vocabularyApi';
import { schedule } from '../utils/scheduler';
import { shuffleArray } from '../utils/shuffleArray';
import type { Grade, LanguageId } from '../types/models';
import type { ReviewCard } from '../types/reviewCard';

/**
 * Drives a single review session: the due-repeats + capped-new-words batch
 * for the selected language (src/lib/vocabularyApi.ts's fetchReviewSession),
 * graded one at a time. Grading a card removes it from the in-memory queue
 * immediately -- reopening the review tab re-fetches, so a card marked
 * "again" comes back due on the next fetch rather than looping within the
 * same sitting.
 */
export function useReviewSession(languageId: LanguageId | null) {
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [loading, setLoading] = useState(!!languageId);
  const [submitting, setSubmitting] = useState(false);

  // Reset during render rather than in an effect, so a language switch clears
  // the stale queue in the same pass instead of flashing it for a frame.
  const [syncedLanguageId, setSyncedLanguageId] = useState(languageId);
  if (languageId !== syncedLanguageId) {
    setSyncedLanguageId(languageId);
    setCards([]);
    setLoading(!!languageId);
  }

  useEffect(() => {
    if (!languageId) return;

    // loading is already true here: either the initial state (languageId set
    // on mount) or the render-time reset above (languageId just changed to a
    // truthy value) already set it before this effect runs.
    let cancelled = false;
    vocabularyApi
      .fetchReviewSession(languageId)
      .then((fetched) => {
        if (!cancelled) setCards(shuffleArray(fetched));
      })
      .catch((error) => {
        console.error('Error loading review session:', error);
        alert('Failed to load review session. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [languageId]);

  const submitGrade = async (wordId: number, grade: Grade) => {
    const card = cards.find((c) => c.id === wordId);
    if (!card || submitting) return;

    setSubmitting(true);
    try {
      const next = schedule(card.schedule, grade);
      await vocabularyApi.submitReview(wordId, grade, next);
      setCards((current) => current.filter((c) => c.id !== wordId));
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to save your review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return { cards, loading, submitting, submitGrade };
}
