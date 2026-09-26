import { useMemo, useState } from 'react';
import {
  DRILL_SESSION_SIZE,
  MAX_RETRIES_PER_ITEM,
  RETRY_OFFSET_MAX,
  RETRY_OFFSET_MIN,
  type ConjugationLanguageConfig,
} from '../constants/conjugation';
import {
  buildConjugationQueue,
  reinsertAfterWrong,
  type DrillItem,
} from '../utils/buildConjugationQueue';
import { formsFor } from '../utils/conjugationForms';
import { gradeConjugation, type GradeResult } from '../utils/gradeConjugation';
import type { DrillWord } from './useConjugationPool';

export type DrillPhase = 'question' | 'feedback' | 'done';

export interface DrillOutcome {
  item: DrillItem;
  verb: DrillWord;
  /** The FIRST attempt's result -- only that counts toward the score. */
  result: GradeResult;
}

/**
 * One Conjugation Drill session, entirely in memory: free practice, no
 * spaced repetition, nothing written to review_log or word_schedule_state
 * (docs/practice-hub-spec.md). Remount the consumer (a new React key) to
 * start another session with the same settings.
 *
 *   question -> check() -> feedback -> next() -> question ... -> done
 *
 * A wrong answer is re-queued a few questions later (reinsertAfterWrong);
 * an "almost" isn't. Progress and the score count the ORIGINAL questions
 * only, so neither can pass the session size however many retries run.
 */
export function useConjugationDrill(
  verbs: DrillWord[],
  tenses: string[],
  config: ConjugationLanguageConfig,
) {
  const verbsById = useMemo(() => new Map(verbs.map((verb) => [verb.id, verb])), [verbs]);
  const [queue, setQueue] = useState<DrillItem[]>(() =>
    buildConjugationQueue({
      verbs,
      tenses,
      persons: config.persons.map((person) => person.key),
      size: DRILL_SESSION_SIZE,
    }),
  );
  const [total] = useState(queue.length);
  const [position, setPosition] = useState(0);
  const [phase, setPhase] = useState<DrillPhase>(queue.length > 0 ? 'question' : 'done');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<GradeResult | null>(null);
  const [outcomes, setOutcomes] = useState<DrillOutcome[]>([]);

  const item = queue[position] as DrillItem | undefined;
  const verb = item ? verbsById.get(item.verbId) : undefined;
  const variants = item && verb ? formsFor(verb.conjugations, item.tense, item.person) : [];

  // Questions finished so far; the current one counts once Next is tapped.
  const answered = queue.slice(0, position).filter((i) => i.retry === 0).length;

  const check = () => {
    if (phase !== 'question' || !item || !verb || !input.trim()) return;
    const graded = gradeConjugation(input, variants, config.subjectPronouns);
    setResult(graded);
    setPhase('feedback');
    if (item.retry === 0) setOutcomes((current) => [...current, { item, verb, result: graded }]);
    if (graded.grade === 'wrong') {
      setQueue((current) =>
        reinsertAfterWrong(current, position, {
          minOffset: RETRY_OFFSET_MIN,
          maxOffset: RETRY_OFFSET_MAX,
          maxRetries: MAX_RETRIES_PER_ITEM,
        }),
      );
    }
  };

  const next = () => {
    if (phase !== 'feedback') return;
    setInput('');
    setResult(null);
    if (position + 1 >= queue.length) {
      setPosition(queue.length);
      setPhase('done');
    } else {
      setPosition(position + 1);
      setPhase('question');
    }
  };

  return {
    item,
    verb,
    variants,
    phase,
    input,
    setInput,
    result,
    check,
    next,
    answered: phase === 'done' ? total : answered,
    total,
    outcomes,
  };
}
