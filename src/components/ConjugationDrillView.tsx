import { useEffect, useLayoutEffect, useRef, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import type { ConjugationLanguageConfig, TenseConfig } from '../constants/conjugation';
import { useConjugationDrill } from '../hooks/useConjugationDrill';
import type { DrillWord } from '../hooks/useConjugationPool';
import { AnswerInput } from './AnswerInput';
import { ConjugationNote } from './ConjugationNote';
import { ConjugationPrompt } from './ConjugationPrompt';
import { ConjugationTable } from './ConjugationTable';
import { FeedbackCard } from './FeedbackCard';
import { PracticeProgress } from './PracticeProgress';
import { SessionSummary } from './SessionSummary';

interface ConjugationDrillViewProps {
  config: ConjugationLanguageConfig;
  verbs: DrillWord[];
  tenses: TenseConfig[];
  onExit: () => void;
  /** Must re-render synchronously (flushSync) so the new session can focus its input inside the tap. */
  onPracticeAgain: () => void;
}

/**
 * The Conjugation Drill (screens 3-5): typed production, graded
 * correct/almost/wrong with immediate corrective feedback, then a summary.
 *
 * Keyboard (3b): the input is focused whenever a question appears. On iOS
 * Safari -- including as an installed PWA -- the keyboard only opens for a
 * focus() that happens inside the user's tap, so every transition INTO a
 * question (Start, Next, Practice again) commits synchronously with
 * flushSync, and the layout effect below focuses the input within that
 * same event handler's call stack. Check blurs it, which closes the
 * keyboard so the feedback card is fully visible; Enter or Next moves on.
 */
export function ConjugationDrillView({
  config,
  verbs,
  tenses,
  onExit,
  onPracticeAgain,
}: ConjugationDrillViewProps) {
  const drill = useConjugationDrill(
    verbs,
    tenses.map((t) => t.key),
    config,
  );
  const { item, verb, phase, input, result } = drill;
  const inputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (phase === 'question') inputRef.current?.focus({ preventScroll: true });
  }, [phase, item]);

  const goNext = () => {
    flushSync(() => drill.next());
    // Also focus here, directly in the handler: belt and braces for iOS.
    inputRef.current?.focus({ preventScroll: true });
  };

  // Enter moves on from feedback too, though the input is blurred by then
  // (a hardware keyboard, or desktop).
  const goNextRef = useRef(goNext);
  useLayoutEffect(() => {
    goNextRef.current = goNext;
  });
  useEffect(() => {
    if (phase !== 'feedback') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.repeat) {
        e.preventDefault();
        goNextRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (phase !== 'question' || !input.trim()) return;
    drill.check();
    inputRef.current?.blur();
  };

  const close = () => {
    const midSession = phase !== 'done' && (drill.answered > 0 || phase === 'feedback');
    if (midSession && !window.confirm('Leave this drill? Progress in this session will be lost.')) {
      return;
    }
    onExit();
  };

  if (phase === 'done') {
    const missed = drill.outcomes.filter((o) => o.result.grade === 'wrong').length;
    const almost = drill.outcomes.filter((o) => o.result.grade === 'almost').length;
    const rows = drill.outcomes
      .filter((o) => o.result.grade !== 'correct')
      .map(({ item: outcomeItem, verb: outcomeVerb, result: outcomeResult }) => {
        const person = config.persons.find((p) => p.key === outcomeItem.person);
        const tense = config.tenses.find((t) => t.key === outcomeItem.tense);
        return {
          key: outcomeItem.origin,
          grade: outcomeResult.grade as 'almost' | 'wrong',
          meta: [
            person?.label ?? outcomeItem.person,
            config.displayInfinitive(outcomeVerb.conjugations),
            (tense?.label ?? outcomeItem.tense).toLowerCase(),
          ].join(' · '),
          answer: outcomeResult.expected,
        };
      });
    return (
      <div className="practice-screen">
        <SessionSummary
          title="Conjugation Drill · done"
          score={drill.total - missed - almost}
          total={drill.total}
          almostCount={almost}
          missedCount={missed}
          rows={rows}
          onPracticeAgain={onPracticeAgain}
          onBack={onExit}
        />
      </div>
    );
  }

  if (!item || !verb) return null;

  const person = config.persons.find((p) => p.key === item.person)!;
  const tenseLabel = config.tenses.find((t) => t.key === item.tense)?.label ?? item.tense;
  const canonical = drill.variants[0] ?? '';
  // The prompt's pronoun follows the canonical form ("j'" before "ai"); the
  // feedback card's follows the variant it shows, which is the same for
  // every French person with more than one variant.
  const promptPronoun = config.pronounLabel(person, canonical, verb.conjugations);
  const feedbackPronoun = result
    ? config.pronounLabel(person, result.expected, verb.conjugations)
    : promptPronoun;

  return (
    <div className="practice-screen">
      <PracticeProgress answered={drill.answered} total={drill.total} onClose={close} />

      <ConjugationPrompt
        tenseLabel={tenseLabel}
        pronoun={promptPronoun}
        infinitive={config.displayInfinitive(verb.conjugations)}
        meaning={verb.translation?.text ?? null}
      />

      <form className="conj-answer-row" onSubmit={onSubmit}>
        <AnswerInput
          ref={inputRef}
          prefix={promptPronoun}
          value={input}
          state={result?.grade ?? 'idle'}
          lang={config.inputLang}
          onChange={drill.setInput}
        />
        {phase === 'question' ? (
          <button
            type="submit"
            className="button button-primary conj-check-button"
            disabled={!input.trim()}
            // Keep the input focused through the tap; onSubmit blurs it
            // deliberately once graded.
            onMouseDown={(e) => e.preventDefault()}
          >
            Check
          </button>
        ) : (
          <button
            type="button"
            className="button button-primary conj-check-button"
            onClick={goNext}
          >
            Next
          </button>
        )}
      </form>

      {result?.grade === 'correct' && <div className="conj-feedback-correct">Correct</div>}

      {result?.grade === 'almost' && (
        <FeedbackCard
          variant="almost"
          pronoun={feedbackPronoun}
          segments={result.segments}
          typed={input.trim()}
        />
      )}

      {result?.grade === 'wrong' && (
        <FeedbackCard variant="wrong" pronoun={feedbackPronoun} segments={result.segments}>
          <ConjugationTable
            config={config}
            conjugations={verb.conjugations}
            tense={item.tense}
            highlightPerson={item.person}
          />
          <ConjugationNote note={config.note(verb.conjugations, item.tense)} />
        </FeedbackCard>
      )}
    </div>
  );
}
