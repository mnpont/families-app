import { CheckIcon } from './icons/CheckIcon';

export type TenseChipState = 'on' | 'off' | 'lockedLast';

interface TenseChipProps {
  label: string;
  state: TenseChipState;
  /** Changes on every refused tap of the last chip that's on, replaying the ring pulse. */
  pulseKey?: number;
  onClick: () => void;
}

/**
 * A tense toggle in the drill setup sheet. 'lockedLast' is the only chip
 * still on after the learner tried to turn it off too: it stays on and
 * pulses a ring instead (the sheet shows "Keep at least one tense on.").
 */
export function TenseChip({ label, state, pulseKey, onClick }: TenseChipProps) {
  const on = state !== 'off';
  return (
    <button
      // Re-keying on each refused tap remounts the chip, restarting its CSS pulse.
      key={state === 'lockedLast' ? pulseKey : undefined}
      type="button"
      className={`tense-chip ${on ? 'tense-chip--on' : 'tense-chip--off'} ${
        state === 'lockedLast' ? 'tense-chip--locked' : ''
      }`}
      aria-pressed={on}
      onClick={onClick}
    >
      {on && <CheckIcon strokeWidth={3} />}
      {label}
    </button>
  );
}
