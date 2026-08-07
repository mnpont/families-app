import { useEffect, useRef, useState } from 'react';
import { usePracticeSession, type PracticeQuestion } from '../hooks/usePracticeSession';
import type { Grade, LanguageId } from '../types/models';
import { GradeButtons } from './GradeButtons';
import { MultipleChoiceCard } from './MultipleChoiceCard';

interface PracticeViewProps {
  languageId: LanguageId | null;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
/** Crossfade duration, each direction -- see docs/practice-mc-spec.md "Advancing to next question." */
const FADE_MS = 220;

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
    await wait(FADE_MS);
    await gradePromise;
    setAnsweredCount((n) => n + 1);
    setSelected(null);
    setFrozenQuestion(null);
    await wait(FADE_MS);
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

      <div className={`practice-question ${isAnimating ? 'fade-out' : ''}`}>
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
