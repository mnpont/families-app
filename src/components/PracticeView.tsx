import { useEffect, useRef, useState } from 'react';
import { usePracticeSession } from '../hooks/usePracticeSession';
import type { Grade, LanguageId } from '../types/models';
import { GradeButtons } from './GradeButtons';
import { MultipleChoiceCard } from './MultipleChoiceCard';

interface PracticeViewProps {
  languageId: LanguageId | null;
}

export function PracticeView({ languageId }: PracticeViewProps) {
  const { questions, loading, submitGrade } = usePracticeSession(languageId);
  const [selected, setSelected] = useState<string | null>(null);

  // Progress is "how many of this session's original batch have been graded
  // so far" -- total is captured once per language, not recomputed as the
  // live queue shrinks (docs/practice-mc-spec.md "State Management").
  const [sessionTotal, setSessionTotal] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const initializedRef = useRef(false);

  // Reset during render rather than in an effect, so a language switch clears
  // stale progress/selection in the same pass instead of flashing it for a frame.
  // (initializedRef is a ref, not state -- mutating it must stay in an effect,
  // below, since refs can't be written during render.)
  const [syncedLanguageId, setSyncedLanguageId] = useState(languageId);
  if (languageId !== syncedLanguageId) {
    setSyncedLanguageId(languageId);
    setAnsweredCount(0);
    setSelected(null);
  }

  useEffect(() => {
    initializedRef.current = false;
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
  // A card whose write failed goes back in the queue (useReviewSession) and is
  // answered again, so the raw count can pass the batch size -- never show
  // "5/4".
  const graded = Math.min(answeredCount, sessionTotal);

  /**
   * Advancing is deliberately instant and un-animated: grading removes the
   * card from the queue optimistically (see useReviewSession), so the next
   * question renders complete -- prompt, options and grading row together --
   * in the very next frame, never waiting on the write and never showing a
   * partially-painted or empty card in between. Earlier versions slid the
   * card out, hid it for the length of the network round-trip and slid the
   * next one in, which is what read as the question "jumping around" and
   * arriving in pieces.
   *
   * submitGrade is intentionally not awaited; it reports its own failures
   * and puts the card back in the queue if the write doesn't land.
   */
  const handleGrade = (grade: Grade) => {
    if (!selected) return;
    setSelected(null);
    setAnsweredCount((n) => n + 1);
    void submitGrade(current.card.id, grade);
  };

  return (
    <div className="practice-container">
      <div className="practice-progress">
        <div className="practice-progress-track">
          <div
            className="practice-progress-fill"
            style={{ width: sessionTotal > 0 ? `${(graded / sessionTotal) * 100}%` : '0%' }}
          />
        </div>
        <div className="practice-progress-label">
          {graded}/{sessionTotal}
        </div>
      </div>

      {/*
        Keyed by card id so every question is a fresh subtree. A newly mounted
        element doesn't run CSS transitions, so the grading row mounts already
        hidden (--pending) instead of fading its previous answered state out
        over the new question -- the stale Again/Hard/Good/Easy row that used
        to flash on top of the next word.
      */}
      <div key={current.card.id} className="practice-question">
        <MultipleChoiceCard
          prompt={current.card.text}
          options={current.options}
          correctAnswer={current.correctAnswer}
          selected={selected}
          onSelect={(option) => !selected && setSelected(option)}
        />

        <div
          className={`flashcard-nav practice-grade-row ${!selected ? 'flashcard-nav--pending' : ''}`}
        >
          <GradeButtons onGrade={handleGrade} disabled={!selected} />
        </div>
      </div>
    </div>
  );
}
