import type { VocabWord } from './vocabWord';
import type { ScheduleState } from '../utils/scheduler';

/** A VocabWord due for review, carrying the scheduler state needed to grade it. */
export interface ReviewCard extends VocabWord {
  schedule: ScheduleState;
}
