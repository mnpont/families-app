import { DeleteIcon } from './icons/DeleteIcon';

interface PracticeProgressProps {
  answered: number;
  total: number;
  /** Shows the ✕ that leaves the exercise (back to the hub). */
  onClose?: () => void;
}

/** The progress row shared by the hub's exercises: optional ✕, gradient track, "7/20". */
export function PracticeProgress({ answered, total, onClose }: PracticeProgressProps) {
  const shown = Math.min(answered, total);
  return (
    <div className="practice-progress">
      {onClose && (
        <button type="button" className="practice-close-button" onClick={onClose} title="Close">
          <DeleteIcon />
        </button>
      )}
      <div className="practice-progress-track">
        <div
          className="practice-progress-fill"
          style={{ width: total > 0 ? `${(shown / total) * 100}%` : '0%' }}
        />
      </div>
      <div className="practice-progress-label">
        {shown}/{total}
      </div>
    </div>
  );
}
