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

/** Case-insensitive trim + dedupe against the correct answer, shared shape with the Edge Function's own sanitizing (supabase/functions/_shared/generateDistractors.ts). */
function sanitizeLlmDistractors(raw: string[] | null, correctAnswer: string): string[] {
  if (!raw) return [];
  const seen = new Set<string>([correctAnswer.trim().toLowerCase()]);
  const cleaned: string[] = [];
  for (const entry of raw) {
    const trimmed = entry.trim();
    const lower = trimmed.toLowerCase();
    if (!trimmed || seen.has(lower)) continue;
    seen.add(lower);
    cleaned.push(trimmed);
  }
  return cleaned;
}

/**
 * Drives a Practice session: the same due-queue/grading as Flashcards
 * (src/hooks/useReviewSession.ts, untouched), layered with multiple-choice
 * distractors. Prefers each card's LLM-generated distractors
 * (words.llm_distractors, migration 015, generated once per word by the
 * generate-distractors Edge Function) and tops up with the client-side
 * deck/length/part-of-speech heuristic (src/utils/pickDistractors.ts) --
 * drawn from every word already in the language, reusing
 * vocabularyApi.fetchVocabulary, no new Supabase query -- whenever a word
 * has fewer than 3 usable LLM distractors (not yet generated, generation
 * failed, or predates the feature).
 *
 * A due card is only "practicable" if it has a translation AND at least one
 * distractor (LLM or heuristic) can be found for it -- cards that don't
 * clear that bar are filtered out of `questions` rather than shown with too
 * few options. They stay due and simply aren't offered here this session
 * (docs/practice-mc-spec.md "Distractor pool edge cases").
 */
export function usePracticeSession(languageId: LanguageId | null) {
  const { cards, loading: loadingCards, submitting, submitGrade } = useReviewSession(languageId);
  const [pool, setPool] = useState<DistractorCandidate[]>([]);
  // ReviewCard doesn't carry deck membership (see toReviewCard in vocabularyApi.ts) --
  // this map recovers it from the same vocabulary fetch that builds the distractor pool,
  // so distractors can be preferentially drawn from the correct answer's own deck.
  const [deckByWordId, setDeckByWordId] = useState<Map<number, string>>(new Map());
  const [poolLoading, setPoolLoading] = useState(true);

  useEffect(() => {
    if (!languageId) {
      setPool([]);
      setDeckByWordId(new Map());
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
          .map((word) => ({
            wordId: word.id,
            text: word.translation!.text,
            deckName: word.deckName,
            partOfSpeech: word.partOfSpeech,
          }));
        setPool(candidates);
        setDeckByWordId(new Map(snapshot.words.map((word) => [word.id, word.deckName])));
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

      const llmDistractors = sanitizeLlmDistractors(card.llmDistractors, correctAnswer).slice(0, OPTION_COUNT - 1);
      const stillNeeded = OPTION_COUNT - 1 - llmDistractors.length;
      const heuristicDistractors =
        stillNeeded > 0
          ? pickDistractors(pool, card.id, correctAnswer, stillNeeded, {
              preferredDeckName: deckByWordId.get(card.id),
              preferredPartOfSpeech: card.partOfSpeech,
              exclude: llmDistractors,
            })
          : [];

      const distractors = [...llmDistractors, ...heuristicDistractors];
      if (distractors.length === 0) return [];

      return [{ card, options: shuffleArray([correctAnswer, ...distractors]), correctAnswer }];
    });
  }, [cards, pool, deckByWordId]);

  return { questions, loading: loadingCards || poolLoading, submitting, submitGrade };
}
