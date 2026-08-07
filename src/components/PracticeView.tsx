import { useEffect, useRef, useState } from 'react';
import { usePracticeSession, type PracticeQuestion } from '../hooks/usePracticeSession';
import type { Grade, LanguageId } from '../types/models';
import { GradeButtons } from './GradeButtons';
import { MultipleChoiceCard } from './MultipleChoiceCard';

interface PracticeViewProps {
  languageId: LanguageId | null;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
/**
 * Exit slide duration -- deliberately a transform, not an opacity crossfade:
 * opacity affects the whole subtree's alpha, so a fading parent makes the
 * solid .mc-option cards render semi-transparent for the length of the
 * transition -- exactly the "looks transparent" report this replaced. A
 * translateY slide never touches opacity, so option cards stay fully solid.
 */
const EXIT_MS = 180;
/**
 * Floor on how long the card stays hidden after the exit slide, so a very
 * fast grade submission doesn't cause a jarring instant swap. Actual hidden
 * time is max(this, the real network wait) -- see handleGrade's Promise.all.
 */
const MIN_HIDDEN_MS = 120;

export function PracticeView({ languageId }: PracticeViewProps) {
  const { questions, loading, submitting, submitGrade } = usePracticeSession(languageId);
  const [selected, setSelected] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [frozenQuestion, setFrozenQuestion] = useState<PracticeQuestion | null>(null);

  // Progress is "how many of this session's original batch have been graded
  // so far" -- total is captured once per language, not recomputed as the
  // live queue shrinks (docs/practice-mc-spec.md "State Management").
  const [sessionTotal, setSessionTotal] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    initializedRef.current = false;
    setAnsweredCount(0);
    setSelected(null);
    setFrozenQuestion(null);
  }, [languageId]);

  useEffect(() => {
    if (!loading && !initializedRef.current) {
      setSessionTotal(questions.length);
      initializedRef.current = true;
    }
  }, [loading, questions.length]);

  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Loading...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">All Caught Up</div>
        <div className="empty-state-text">Nothing to practice right now</div>
      </div>
    );
  }

  const current = questions[0];
  // While fading, keep showing the question just answered -- `questions` may
  // already have advanced once submitGrade resolves (same trick FlashcardsView
  // uses for its deck animation).
  const displayed = frozenQuestion ?? current;

  const handleGrade = async (grade: Grade) => {
    if (submitting || isAnimating) return;
    setIsAnimating(true);
    setFrozenQuestion(current);
    const gradePromise = submitGrade(current.card.id, grade);
    // Let the exit slide finish (matches the CSS visibility-transition delay
    // below) before the card goes fully hidden. From there, however long the
    // grade submission actually takes is invisible, not a card frozen
    // mid-air -- see PracticeView's earlier "stuck" report: the previous
    // version held the card statically visible at its offset for this
    // entire (variable, network-bound) wait, which is what read as stuck.
    await wait(EXIT_MS);
    await Promise.all([wait(MIN_HIDDEN_MS), gradePromise]);
    setAnsweredCount((n) => n + 1);
    setSelected(null);
    setFrozenQuestion(null);
    // Removing the class now makes the new question visible immediately
    // (the base .practice-question rule has no visibility transition) and
    // starts its entrance slide back to rest -- no extra fixed wait needed.
    setIsAnimating(false);
  };

  return (
    <div className="practice-container">
      <div className="practice-progress">
        <div className="practice-progress-track">
          <div
            className="practice-progress-fill"
            style={{ width: sessionTotal > 0 ? `${(answeredCount / sessionTotal) * 100}%` : '0%' }}
          />
        </div>
        <div className="practice-progress-label">
          {answeredCount}/{sessionTotal}
        </div>
      </div>

      <div className={`practice-question ${isAnimating ? 'practice-question--transitioning' : ''}`}>
        <MultipleChoiceCard
          prompt={displayed.card.text}
          options={displayed.options}
          correctAnswer={displayed.correctAnswer}
          selected={selected}
          onSelect={(option) => !isAnimating && !selected && setSelected(option)}
        />

        <div className={`flashcard-nav practice-grade-row ${!selected ? 'flashcard-nav--pending' : ''}`}>
          <GradeButtons onGrade={handleGrade} disabled={submitting || isAnimating} />
        </div>
      </div>
    </div>
  );
}
