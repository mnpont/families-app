import { useEffect, useRef, useState } from 'react';
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
 *
 * The removal is optimistic: the card leaves the queue before the write is
 * sent, so a view can advance to the next word in the same frame as the tap
 * instead of waiting out a network round-trip (see PracticeView). A failed
 * write puts the card back at the end of the queue so the grade isn't
 * silently lost.
 */
export function useReviewSession(languageId: LanguageId | null) {
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [loading, setLoading] = useState(!!languageId);
  const [inFlight, setInFlight] = useState(0);
  // Ids whose grade is already sent or saved. Guards against a double-tap
  // grading the same card twice in a single frame, where `cards` in the
  // handler's closure hasn't re-rendered yet.
  const gradedIdsRef = useRef<Set<number>>(new Set());

  // Reset during render rather than in an effect, so a language switch clears
  // the stale queue in the same pass instead of flashing it for a frame.
  // (gradedIdsRef is a ref, not state -- mutating it must stay in an effect,
  // below, since refs can't be written during render.)
  const [syncedLanguageId, setSyncedLanguageId] = useState(languageId);
  if (languageId !== syncedLanguageId) {
    setSyncedLanguageId(languageId);
    setCards([]);
    setLoading(!!languageId);
  }

  useEffect(() => {
    gradedIdsRef.current = new Set();
  }, [languageId]);

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
    if (!card || gradedIdsRef.current.has(wordId)) return;

    gradedIdsRef.current.add(wordId);
    setCards((current) => current.filter((c) => c.id !== wordId));
    setInFlight((n) => n + 1);
    try {
      const next = schedule(card.schedule, grade);
      await vocabularyApi.submitReview(wordId, grade, next);
    } catch (error) {
      console.error('Error submitting review:', error);
      // Put it back at the end of the queue rather than dropping it, so the
      // word still gets reviewed this sitting.
      gradedIdsRef.current.delete(wordId);
      setCards((current) => (current.some((c) => c.id === wordId) ? current : [...current, card]));
      alert('Failed to save your review. Please try again.');
    } finally {
      setInFlight((n) => n - 1);
    }
  };

  return { cards, loading, submitting: inFlight > 0, submitGrade };
}
