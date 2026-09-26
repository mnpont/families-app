import type { ReactNode } from 'react';
import type { Segment } from '../utils/gradeConjugation';

interface FeedbackCardProps {
  variant: 'almost' | 'wrong';
  pronoun: string;
  segments: Segment[];
  /** What the learner typed -- shown under an "almost". */
  typed?: string;
  /** Under a "wrong": the table and rule note. */
  children?: ReactNode;
}

/**
 * The card under a graded answer (screens 4b/4c). Almost: the correct form
 * with the accents the learner missed highlighted. Wrong: the correct form
 * with what differs highlighted, then whatever the caller passes (the
 * conjugation table and note).
 */
export function FeedbackCard({ variant, pronoun, segments, typed, children }: FeedbackCardProps) {
  const form = (
    <div className="feedback-form-row">
      <span className="feedback-form-pronoun">{pronoun}</span>
      <span className="feedback-form">
        {segments.map((segment, i) =>
          segment.mark ? (
            <span key={i} className={`feedback-mark feedback-mark--${variant}`}>
              {segment.text}
            </span>
          ) : (
            <span key={i}>{segment.text}</span>
          ),
        )}
      </span>
    </div>
  );

  if (variant === 'almost') {
    return (
      <div className="feedback-card feedback-card--almost">
        <div className="feedback-card-title">Almost — watch the accents</div>
        {form}
        {typed && (
          <div className="feedback-typed">
            You typed <strong>{typed}</strong>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="feedback-card feedback-card--wrong">
      <div className="feedback-card-label">Correct form</div>
      {form}
      {children && (
        <>
          <div className="feedback-divider" />
          {children}
        </>
      )}
    </div>
  );
}
