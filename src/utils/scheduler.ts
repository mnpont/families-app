import type { Grade } from '../types/models';

/**
 * SM-2-style spaced-repetition scheduler (docs/learning-science.md Tier 1
 * #1), not full FSRS -- SM-2 gets most of the benefit for far less
 * complexity, per the research doc's own recommendation.
 *
 * Deliberate deviation from textbook SM-2: the original formula's ease
 * delta for a failed review is -0.8, which (once clamped to the 1.3 floor)
 * leaves a card's ease permanently bottomed out after just one or two
 * lapses -- "good"/"easy" grades afterward only add back 0/+0.1 per
 * review, so recovering to a normal ease factor takes a dozen-plus
 * successful reviews. That's the well-documented "stuck at the floor"
 * flaw. Here every grade's ease delta (including "again") is capped to a
 * small, bounded step (see EASE_DELTA below), so a handful of subsequent
 * good reviews can undo a lapse instead of a card being punished
 * indefinitely for one bad day.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const MIN_EASE_FACTOR = 1.3;
const MAX_EASE_FACTOR = 3.0;
const DEFAULT_EASE_FACTOR = 2.5;

const EASE_DELTA: Record<Grade, number> = {
  again: -0.2,
  hard: -0.15,
  good: 0,
  easy: 0.15,
};

/** Fixed multiplier for "hard" successes -- grows the interval, but slower than a full ease-factor multiply. */
const HARD_INTERVAL_MULTIPLIER = 1.2;
/** Extra growth on top of the ease factor for "easy" successes. */
const EASY_BONUS_MULTIPLIER = 1.3;

export interface ScheduleState {
  intervalDays: number;
  easeFactor: number;
  /** Consecutive-success repetition count; resets to 0 on "again". */
  reviewCount: number;
}

export interface ScheduleResult extends ScheduleState {
  dueAt: Date;
}

export function defaultScheduleState(): ScheduleState {
  return { intervalDays: 0, easeFactor: DEFAULT_EASE_FACTOR, reviewCount: 0 };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Computes the next schedule state from the current one and a grade. Pure -- no I/O, no dates read internally. */
export function schedule(current: ScheduleState, grade: Grade, now: Date = new Date()): ScheduleResult {
  const easeFactor = clamp(current.easeFactor + EASE_DELTA[grade], MIN_EASE_FACTOR, MAX_EASE_FACTOR);

  if (grade === 'again') {
    // Lapsed: back into the queue right away (due "soon", not after a
    // multi-day gap), and the repetition count restarts from scratch so
    // the next success re-climbs the 1-day/6-day onboarding steps below.
    return { intervalDays: 0, easeFactor, reviewCount: 0, dueAt: now };
  }

  const reviewCount = current.reviewCount + 1;
  let intervalDays: number;
  if (reviewCount === 1) {
    intervalDays = 1;
  } else if (reviewCount === 2) {
    intervalDays = 6;
  } else {
    const multiplier = grade === 'hard' ? HARD_INTERVAL_MULTIPLIER : easeFactor;
    intervalDays = current.intervalDays * multiplier;
    if (grade === 'easy') intervalDays *= EASY_BONUS_MULTIPLIER;
  }

  const dueAt = new Date(now.getTime() + intervalDays * DAY_MS);
  return { intervalDays, easeFactor, reviewCount, dueAt };
}
