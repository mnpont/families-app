/**
 * The vocabulary shape currently used at runtime, matching the existing
 * Supabase `words` table (see /migrations for the v2 replacement schema).
 * This type is intentionally still German/English-shaped — it exists to
 * type-check the lift-and-shift of the current app, not to model the
 * future multi-language design. See src/types/models.ts for that, and
 * docs/v2-plan.md Section 1 for the migration this will be replaced by.
 */
export interface LegacyWord {
  id: number;
  german: string;
  english: string;
  family: string;
  dateAdded: string;
  exampleSentenceDe?: string | null;
  exampleSentenceEn?: string | null;
}

/** Shape of a `words` row as returned by Supabase (snake_case columns). */
export interface LegacyWordRow {
  id: number;
  german: string;
  english: string;
  family: string;
  date_added: string;
  example_sentence_de?: string | null;
  example_sentence_en?: string | null;
}

export function rowToLegacyWord(row: LegacyWordRow): LegacyWord {
  return {
    id: row.id,
    german: row.german,
    english: row.english,
    family: row.family,
    dateAdded: row.date_added,
    exampleSentenceDe: row.example_sentence_de ?? null,
    exampleSentenceEn: row.example_sentence_en ?? null,
  };
}
