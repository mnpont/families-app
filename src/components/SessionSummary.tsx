interface SummaryRowData {
  key: string | number;
  grade: 'almost' | 'wrong';
  /** "nous · aller · passé composé" */
  meta: string;
  /** "sommes allés" */
  answer: string;
}

interface SessionSummaryProps {
  title: string;
  score: number;
  total: number;
  almostCount: number;
  missedCount: number;
  rows: SummaryRowData[];
  onPracticeAgain: () => void;
  onBack: () => void;
}

/** One form to look at again: state dot, "person · verb · tense", "→ form". */
export function SummaryRow({ grade, meta, answer }: Omit<SummaryRowData, 'key'>) {
  return (
    <div className="summary-row">
      <span className={`summary-dot summary-dot--${grade}`} aria-label={grade} />
      <div>
        <div className="summary-meta">{meta}</div>
        <div className="summary-answer">
          <span className="summary-arrow">→</span> {answer}
        </div>
      </div>
    </div>
  );
}

/**
 * End of a session (screen 5): score as correct-on-the-first-try over the
 * session size, almost/missed pills (hidden at 0), and every form that
 * wasn't right first time. No confetti, streaks or points.
 */
export function SessionSummary({
  title,
  score,
  total,
  almostCount,
  missedCount,
  rows,
  onPracticeAgain,
  onBack,
}: SessionSummaryProps) {
  return (
    <div className="session-summary">
      <div className="session-summary-top">
        <div className="session-summary-kicker">{title}</div>
        <div className="session-summary-score">
          <span className="session-summary-score-value">{score}</span>
          <span className="session-summary-score-total">/ {total}</span>
        </div>
        <div className="session-summary-caption">on the first try</div>
        {(almostCount > 0 || missedCount > 0) && (
          <div className="session-summary-pills">
            {almostCount > 0 && (
              <span className="session-summary-pill session-summary-pill--almost">
                {almostCount} almost
              </span>
            )}
            {missedCount > 0 && (
              <span className="session-summary-pill session-summary-pill--missed">
                {missedCount} missed
              </span>
            )}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <>
          <div className="session-summary-heading">To look at again</div>
          <div className="summary-rows">
            {rows.map(({ key, ...row }) => (
              <SummaryRow key={key} {...row} />
            ))}
          </div>
        </>
      )}

      <div className="session-summary-actions">
        <button type="button" className="button button-primary" onClick={onPracticeAgain}>
          Practice again
        </button>
        <button type="button" className="button button-secondary" onClick={onBack}>
          Back to Practice
        </button>
      </div>
    </div>
  );
}
