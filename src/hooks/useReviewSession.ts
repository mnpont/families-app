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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!languageId) {
      setCards([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
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
