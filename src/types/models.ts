/**
 * Language-agnostic v2 data model, per docs/v2-plan.md Section 1. These
 * types mirror the SQL schema in /migrations. src/lib/vocabularyApi.ts reads
 * and writes against them directly; src/types/legacyWord.ts only survives
 * for the one-time backfill script (scripts/backfillToV2Schema.ts) and its
 * bundled seed data.
 */

/** ISO 639-1 code, e.g. "de", "en", "es", "fr". */
export type LanguageId = string;

export interface Language {
  id: LanguageId;
  name: string;
}

/** Word-type options offered in Add/Edit Word -- gates which words are eligible for a gender chip (only 'noun'). */
export const WORD_TYPES = ['noun', 'verb', 'adjective', 'phrase', 'other'] as const;
export type WordType = (typeof WORD_TYPES)[number];

/** Grammatical gender, or 'plural' for a plural noun form that has no gender of its own (see src/utils/parseGender.ts). */
export type Gender = 'masc' | 'fem' | 'neutr' | 'plural';

/** A vocabulary item in its own language — not paired to a translation. */
export interface Word {
  id: number;
  languageId: LanguageId;
  text: string;
  partOfSpeech?: string | null;
  gender?: Gender | null;
  notes?: string | null;
  createdAt: string;
}

/** A gloss/translation of a Word into another language. */
export interface Translation {
  id: number;
  wordId: number;
  languageId: LanguageId;
  text: string;
  /** Which translation to show by default when a word has more than one. */
  isPrimary: boolean;
  createdAt: string;
}

/** An example sentence using a Word, optionally with its own translation. */
export interface ExampleSentence {
  id: number;
  wordId: number;
  languageId: LanguageId;
  text: string;
  translationText?: string | null;
  createdAt: string;
}

/**
 * A user-defined category of words, scoped to one target language.
 * `ownerId` exists from day one (defaulted to a single hardcoded owner,
 * see src/constants/owner.ts) so real multi-user support later doesn't
 * require a second migration.
 */
export interface Deck {
  id: number;
  name: string;
  languageId: LanguageId;
  ownerId: string;
  createdAt: string;
}

/** Join table — a Word can belong to multiple Decks. */
export interface DeckWord {
  deckId: number;
  wordId: number;
  addedAt: string;
}

/** Confidence self-rating a learner gives after attempting recall. */
export type Grade = 'again' | 'hard' | 'good' | 'easy';

/**
 * Which kind of review produced a ReviewLog row. Only 'recognition' (see
 * the word, recall the meaning) is implemented -- 'production' (typing) and
 * 'cloze' are Phase 2 (docs/v2-plan.md), but the column exists now so they
 * don't need a second migration later.
 */
export type ReviewMode = 'recognition' | 'production' | 'cloze';

/**
 * Append-only history of every review attempt -- never updated, only
 * inserted. `userId` exists from day one (defaulted to the single
 * hardcoded owner, see src/constants/owner.ts) exactly like Deck.ownerId,
 * so real multi-user support later is a data backfill, not a migration.
 */
export interface ReviewLog {
  id: number;
  wordId: number;
  userId: string;
  reviewedAt: string;
  grade: Grade;
  mode: ReviewMode;
}

/**
 * Live per-word, per-learner SM-2 scheduler state (src/utils/scheduler.ts).
 * Kept separate from ReviewLog (state vs. history) so the scheduler can be
 * recomputed from history without mutating it. `reviewCount` is the
 * consecutive-success repetition count (SM-2's "n"): it resets to 0 on
 * "again" rather than counting total reviews ever.
 */
export interface WordScheduleState {
  wordId: number;
  userId: string;
  intervalDays: number;
  easeFactor: number;
  dueAt: string;
  reviewCount: number;
}
