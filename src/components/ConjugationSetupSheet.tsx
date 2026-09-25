import { useRef, useState, type TouchEvent } from 'react';
import type { TenseConfig } from '../constants/conjugation';
import { DeleteIcon } from './icons/DeleteIcon';
import { TenseChip } from './TenseChip';

interface ConjugationSetupSheetProps {
  tenses: TenseConfig[];
  selected: string[];
  onChange: (selected: string[]) => void;
  verbCount: number;
  questionCount: number;
  onStart: () => void;
  onClose: () => void;
}

/** A downward drag past this many px closes the sheet; anything less springs back. */
const SWIPE_CLOSE_PX = 80;

/**
 * The Conjugation Drill's setup bottom sheet (screens 2a/2b): pick tenses,
 * see "N verbs · M questions" update live, Start. Selection lives in
 * PracticeView for the visit (so Practice again reuses it) and is never
 * persisted. Swipe down, ✕ or a backdrop tap all close it.
 */
export function ConjugationSetupSheet({
  tenses,
  selected,
  onChange,
  verbCount,
  questionCount,
  onStart,
  onClose,
}: ConjugationSetupSheetProps) {
  const [lockedPulse, setLockedPulse] = useState(0);
  const [dragY, setDragY] = useState(0);
  const dragStartRef = useRef<number | null>(null);

  const toggle = (key: string) => {
    if (selected.includes(key)) {
      if (selected.length === 1) {
        setLockedPulse((n) => n + 1);
        return;
      }
      onChange(selected.filter((k) => k !== key));
    } else {
      // Keep config order, whatever order they were tapped in.
      onChange(tenses.map((t) => t.key).filter((k) => k === key || selected.includes(k)));
    }
    setLockedPulse(0);
  };

  const onTouchStart = (e: TouchEvent) => {
    dragStartRef.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: TouchEvent) => {
    if (dragStartRef.current === null) return;
    setDragY(Math.max(0, e.touches[0].clientY - dragStartRef.current));
  };
  const onTouchEnd = () => {
    dragStartRef.current = null;
    if (dragY > SWIPE_CLOSE_PX) onClose();
    else setDragY(0);
  };

  return (
    <div className="overlay overlay--sheet" onClick={onClose}>
      <div
        className="practice-sheet"
        style={dragY > 0 ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="practice-sheet-handle" />
        <button type="button" className="expanded-family-close" onClick={onClose} title="Close">
          <DeleteIcon />
        </button>

        <div className="expanded-family-title practice-sheet-title">Conjugation Drill</div>
        <div className="practice-sheet-text">Type the correct form of your saved verbs.</div>

        <div className="input-label practice-sheet-label">Tenses</div>
        <div className="tense-chips">
          {tenses.map((tense) => {
            const on = selected.includes(tense.key);
            return (
              <TenseChip
                key={tense.key}
                label={tense.label}
                state={!on ? 'off' : lockedPulse > 0 && selected.length === 1 ? 'lockedLast' : 'on'}
                pulseKey={lockedPulse}
                onClick={() => toggle(tense.key)}
              />
            );
          })}
        </div>
        {lockedPulse > 0 && <div className="practice-sheet-hint">Keep at least one tense on.</div>}

        <div className="practice-sheet-info">
          {verbCount} verb{verbCount === 1 ? '' : 's'} · {questionCount} question
          {questionCount === 1 ? '' : 's'}
        </div>
        <button
          type="button"
          className="button button-primary practice-sheet-start"
          onClick={onStart}
          disabled={questionCount === 0}
        >
          Start
        </button>
      </div>
    </div>
  );
}
