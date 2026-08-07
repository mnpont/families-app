import { useEffect, useMemo, useState } from 'react';
import * as vocabularyApi from '../lib/vocabularyApi';
import { useReviewSession } from './useReviewSession';
import { pickDistractors, type DistractorCandidate } from '../utils/pickDistractors';
import { shuffleArray } from '../utils/shuffleArray';
import type { LanguageId } from '../types/models';
import type { ReviewCard } from '../types/reviewCard';

/** 1 correct answer + up to this many distractors. */
const OPTION_COUNT = 4;

export interface PracticeQuestion {
  card: ReviewCard;
  options: string[];
  correctAnswer: string;
}

/**
 * Drives a Practice session: the same due-queue/grading as Flashcards
 * (src/hooks/useReviewSession.ts, untouched), layered with a multiple-choice
 * distractor pool built from every word already in the language (reuses
 * vocabularyApi.fetchVocabulary -- no new Supabase query, see
 * docs/practice-mc-spec.md Part B).
 *
 * A due card is only "practicable" if it has a translation AND at least one
 * distractor can be found for it -- cards that don't clear that bar are
 * filtered out of `questions` rather than shown with too few options. They
 * stay due and simply aren't offered here this session (docs/practice-mc-spec.md
 * "Distractor pool edge cases").
 */
export function usePracticeSession(languageId: LanguageId | null) {
  const { cards, loading: loadingCards, submitting, submitGrade } = useReviewSession(languageId);
  const [pool, setPool] = useState<DistractorCandidate[]>([]);
  const [poolLoading, setPoolLoading] = useState(true);

  useEffect(() => {
    if (!languageId) {
      setPool([]);
      setPoolLoading(false);
      return;
    }

    let cancelled = false;
    setPoolLoading(true);
    vocabularyApi
      .fetchVocabulary(languageId)
      .then((snapshot) => {
        if (cancelled) return;
        const candidates = snapshot.words
          .filter((word) => word.translation)
          .map((word) => ({ wordId: word.id, text: word.translation!.text }));
        setPool(candidates);
      })
      .catch((error) => {
        console.error('Error loading practice distractor pool:', error);
      })
      .finally(() => {
        if (!cancelled) setPoolLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [languageId]);

  const questions = useMemo<PracticeQuestion[]>(() => {
    return cards.flatMap((card) => {
      const correctAnswer = card.translation?.text;
      if (!correctAnswer) return [];

      const distractors = pickDistractors(pool, card.id, correctAnswer, OPTION_COUNT - 1);
      if (distractors.length === 0) return [];

      return [{ card, options: shuffleArray([correctAnswer, ...distractors]), correctAnswer }];
    });
  }, [cards, pool]);

  return { questions, loading: loadingCards || poolLoading, submitting, submitGrade };
}
