/**
 * Language-agnostic v2 data model, per docs/v2-plan.md Section 1.
 *
 * NOT YET WIRED UP: the app still runs against the legacy schema
 * (see src/types/legacyWord.ts) until the Phase 2 data cutover. These
 * types mirror the SQL schema in /migrations and exist so the migration
 * has a typed target to build toward, and so Phase 1 code can start
 * importing real types instead of `any`.
 */

/** ISO 639-1 code, e.g. "de", "en", "es", "fr". */
export type LanguageId = string;

export interface Language {
  id: LanguageId;
  name: string;
}

/** A vocabulary item in its own language — not paired to a translation. */
export interface Word {
  id: number;
  languageId: LanguageId;
  text: string;
  partOfSpeech?: string | null;
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
