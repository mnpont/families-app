/**
 * Backfills the renamed legacy `words_legacy` table (german/english/family
 * columns) into the v2 schema (Language/Word/Translation/ExampleSentence/
 * Deck/DeckWord, see migrations/001-007 and docs/v2-plan.md Section 1).
 *
 * Usage:
 *
 *   npx tsx scripts/backfillToV2Schema.ts --source=local --dry-run
 *     Runs entirely offline against the bundled seed data
 *     (src/data/preLoadedWords.ts) with no network calls and no writes.
 *     Useful for sanity-checking the logic/counts before touching the
 *     live database -- this is what produced the preview numbers shared
 *     alongside this script.
 *
 *   npx tsx scripts/backfillToV2Schema.ts --source=live --dry-run
 *     Reads the real `words_legacy` table via Supabase (needs
 *     VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, e.g. in .env.local) and
 *     computes the same counts against real data, but writes nothing.
 *     Run this before the real thing to catch surprises (e.g. words added
 *     since the last known snapshot).
 *
 *   npx tsx scripts/backfillToV2Schema.ts --source=live
 *     The real backfill: reads `words_legacy` and writes rows into the v2
 *     tables. Run AFTER migrations 001-008 are applied (see
 *     migrations/README.md for the required order -- 002 renames the
 *     original `words` table to `words_legacy` before 003 creates the new
 *     schema's `words` table) and a backup has been taken
 *     (scripts/exportWordsBackup.ts, run before 002's rename).
 *
 * This script was written without any Supabase credentials available in
 * that session -- only --source=local --dry-run was actually run. Live
 * runs need to happen in an environment with real credentials.
 *
 * Live modes read credentials from .env.local via ./loadEnv (same file the
 * app itself uses), or from the environment if exported into the shell.
 */
import './loadEnv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { preLoadedWords } from '../src/data/preLoadedWords';
import { detectTranslationLanguage } from '../src/utils/detectTranslationLanguage';
import { OWNER_ID } from '../src/constants/owner';
import type { LegacyWordRow } from '../src/types/legacyWord';

const LANGUAGE_ID = 'de';
const UNCATEGORIZED_DECK_NAME = 'Uncategorized';

// Matched by exact original german text, not by id: the live table's row
// ids were never set to the local seed array's `id` values (the original
// insert only sent german/english/family/date_added/user_id -- Postgres
// assigned its own identity sequence), so id-based matching against the
// live table would silently match nothing. See detectTranslationLanguage.ts
// for the same reasoning applied to the es/en split.
const GERMAN_TYPO_FIXES: Record<string, string> = {
  'auswendig learnen': 'auswendig lernen',
  'fach bleiben': 'wach bleiben',
};

// Exact (german, english) pairs that landed in "Animals" via a false-positive
// substring match in classifyWord (e.g. "schaf" inside "Botschaft", "ente"
// inside "Prominenten", "tier" inside "Börsenotierung", "bee" inside
// "Beeil dich") rather than genuine animal vocabulary. Identified by
// re-running classifyWord's own regex against every row currently
// categorized "Animals" in the bundled seed data and inspecting which
// keyword actually matched.
//
// "ein Faultier" / "perezoso" (sloth) is deliberately NOT in this list --
// it matches via the same kind of substring ("tier" inside "Faultier") but
// is a genuine animal, so it stays in Animals.
const MISCATEGORIZED_ANIMAL_PAIRS = new Set<string>([
  'der Botschafter|||embajador',
  'die Botschaft|||la embajada',
  'der Fluggesellschaft|||aerolinea',
  'Gesellschaft mit beschränkter Haftung|||GmbH',
  'Die Firma hat abgewirtschaftet|||La empresa se vino abajo',
  'Prominenten|||personas relevantes',
  'Beeil dich|||Beeil dich',
  'Börsenotierung|||valores de la bolsa',
]);

interface Counters {
  rowsProcessed: number;
  wordsCreated: number;
  translationsCreated: number;
  translationsEs: number;
  translationsEn: number;
  exampleSentencesCreated: number;
  decksCreated: number;
  deckWordLinksCreated: number;
  typoFixesApplied: number;
  miscategorizedAnimalsMoved: number;
}

function freshCounters(): Counters {
  return {
    rowsProcessed: 0,
    wordsCreated: 0,
    translationsCreated: 0,
    translationsEs: 0,
    translationsEn: 0,
    exampleSentencesCreated: 0,
    decksCreated: 0,
    deckWordLinksCreated: 0,
    typoFixesApplied: 0,
    miscategorizedAnimalsMoved: 0,
  };
}

/** Where backfilled rows get written -- a live Supabase sink or an in-memory dry-run sink. */
interface Sink {
  createWord(text: string, createdAt: string): Promise<number>;
  createTranslation(wordId: number, languageId: 'es' | 'en', text: string): Promise<void>;
  createExampleSentence(
    wordId: number,
    text: string,
    translationText: string | null,
  ): Promise<void>;
  findOrCreateDeck(name: string): Promise<{ id: number; created: boolean }>;
  linkWordToDeck(deckId: number, wordId: number, addedAt: string): Promise<void>;
}

class DryRunSink implements Sink {
  private nextWordId = 1;
  private nextDeckId = 1;
  private deckIdsByName = new Map<string, number>();

  async createWord(): Promise<number> {
    return this.nextWordId++;
  }

  async createTranslation(): Promise<void> {}

  async createExampleSentence(): Promise<void> {}

  async findOrCreateDeck(name: string): Promise<{ id: number; created: boolean }> {
    const existing = this.deckIdsByName.get(name);
    if (existing !== undefined) return { id: existing, created: false };
    const id = this.nextDeckId++;
    this.deckIdsByName.set(name, id);
    return { id, created: true };
  }

  async linkWordToDeck(): Promise<void> {}
}

class LiveSink implements Sink {
  constructor(private supabase: SupabaseClient) {}

  async createWord(text: string, createdAt: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('words')
      .insert({ language_id: LANGUAGE_ID, text, created_at: createdAt })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  async createTranslation(wordId: number, languageId: 'es' | 'en', text: string): Promise<void> {
    const { error } = await this.supabase
      .from('translations')
      .insert({ word_id: wordId, language_id: languageId, text, is_primary: true });
    if (error) throw error;
  }

  async createExampleSentence(
    wordId: number,
    text: string,
    translationText: string | null,
  ): Promise<void> {
    const { error } = await this.supabase.from('example_sentences').insert({
      word_id: wordId,
      language_id: LANGUAGE_ID,
      text,
      translation_text: translationText,
    });
    if (error) throw error;
  }

  async findOrCreateDeck(name: string): Promise<{ id: number; created: boolean }> {
    const { data: existing, error: selectError } = await this.supabase
      .from('decks')
      .select('id')
      .eq('owner_id', OWNER_ID)
      .eq('language_id', LANGUAGE_ID)
      .eq('name', name)
      .maybeSingle();
    if (selectError) throw selectError;
    if (existing) return { id: existing.id, created: false };

    const { data: inserted, error: insertError } = await this.supabase
      .from('decks')
      .insert({ name, language_id: LANGUAGE_ID, owner_id: OWNER_ID })
      .select('id')
      .single();
    if (insertError) throw insertError;
    return { id: inserted.id, created: true };
  }

  async linkWordToDeck(deckId: number, wordId: number, addedAt: string): Promise<void> {
    const { error } = await this.supabase
      .from('deck_words')
      .insert({ deck_id: deckId, word_id: wordId, added_at: addedAt });
    if (error) throw error;
  }
}

async function processRow(row: LegacyWordRow, sink: Sink, counters: Counters) {
  counters.rowsProcessed++;

  let germanText = row.german;
  if (GERMAN_TYPO_FIXES[germanText]) {
    germanText = GERMAN_TYPO_FIXES[germanText];
    counters.typoFixesApplied++;
  }

  let deckName = row.family;
  if (deckName === 'Animals' && MISCATEGORIZED_ANIMAL_PAIRS.has(`${row.german}|||${row.english}`)) {
    deckName = UNCATEGORIZED_DECK_NAME;
    counters.miscategorizedAnimalsMoved++;
  }

  const translationLanguage = detectTranslationLanguage(row.german, row.english);
  if (translationLanguage === 'es') counters.translationsEs++;
  else counters.translationsEn++;

  const wordId = await sink.createWord(germanText, row.date_added);
  counters.wordsCreated++;

  await sink.createTranslation(wordId, translationLanguage, row.english);
  counters.translationsCreated++;

  if (row.example_sentence_de) {
    await sink.createExampleSentence(
      wordId,
      row.example_sentence_de,
      row.example_sentence_en ?? null,
    );
    counters.exampleSentencesCreated++;
  }

  const deck = await sink.findOrCreateDeck(deckName);
  if (deck.created) counters.decksCreated++;

  await sink.linkWordToDeck(deck.id, wordId, row.date_added);
  counters.deckWordLinksCreated++;
}

function printSummary(counters: Counters, label: string) {
  console.log(`\n=== Backfill summary (${label}) ===`);
  console.log(`Rows processed:               ${counters.rowsProcessed}`);
  console.log(`Words created:                ${counters.wordsCreated}`);
  console.log(`Translations created:         ${counters.translationsCreated}`);
  console.log(`  -> language 'es':           ${counters.translationsEs}`);
  console.log(`  -> language 'en':           ${counters.translationsEn}`);
  console.log(`Example sentences created:    ${counters.exampleSentencesCreated}`);
  console.log(`Decks created:                ${counters.decksCreated}`);
  console.log(`Deck-word links created:      ${counters.deckWordLinksCreated}`);
  console.log(`German typo fixes applied:    ${counters.typoFixesApplied}`);
  console.log(`Miscategorized Animals moved: ${counters.miscategorizedAnimalsMoved}`);
  console.log('');
}

async function loadLegacyRows(source: 'local' | 'live'): Promise<LegacyWordRow[]> {
  if (source === 'local') {
    // preLoadedWords is LegacyWord[] (camelCase); reshape to the
    // snake_case row shape the live table/query would return.
    return preLoadedWords.map((w) => ({
      id: w.id,
      german: w.german,
      english: w.english,
      family: w.family,
      date_added: w.dateAdded,
      example_sentence_de: w.exampleSentenceDe ?? null,
      example_sentence_en: w.exampleSentenceEn ?? null,
    }));
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in the environment.');
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  // Reads from `words_legacy`, not `words` -- by the time this runs,
  // migrations/002_rename_legacy_words_table.sql has already renamed the
  // original table out of the way to make room for the new schema's Word
  // table (see migrations/README.md for the full order of operations).
  const { data, error } = await supabase
    .from('words_legacy')
    .select('*')
    .order('id', { ascending: true });
  if (error) throw error;
  return data as LegacyWordRow[];
}

async function main() {
  const args = process.argv.slice(2);
  const sourceArg = args.find((a) => a.startsWith('--source='));
  const source = (sourceArg?.split('=')[1] ?? 'local') as 'local' | 'live';
  const dryRun = source === 'local' || args.includes('--dry-run');

  if (source !== 'local' && source !== 'live') {
    console.error(`Unknown --source value: ${source}. Use "local" or "live".`);
    process.exit(1);
  }

  const rows = await loadLegacyRows(source);
  console.log(
    `Loaded ${rows.length} legacy rows from ${source === 'local' ? 'src/data/preLoadedWords.ts' : 'the live `words` table'}.`,
  );

  const counters = freshCounters();

  let sink: Sink;
  if (dryRun) {
    sink = new DryRunSink();
  } else {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in the environment.');
    }
    sink = new LiveSink(createClient(supabaseUrl, supabaseAnonKey));
  }

  for (const row of rows) {
    await processRow(row, sink, counters);
  }

  const label = `source=${source}${dryRun ? ', DRY RUN -- no writes performed' : ', LIVE WRITE'}`;
  printSummary(counters, label);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
