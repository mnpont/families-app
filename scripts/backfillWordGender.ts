/**
 * One-time backfill for src/lib/genderApi.ts: resolves and stores gender
 * for every existing German/French word that predates the gender-chip
 * feature (migrations/014_add_words_gender.sql) and so still has
 * gender = null. New words get this automatically at add/edit time
 * (src/lib/vocabularyApi.ts createWord/updateWord) -- this script only
 * exists to sweep up the backlog once, and can be re-run safely any time
 * (it only ever touches rows where gender is still null).
 *
 * Usage:
 *
 *   npx tsx scripts/backfillWordGender.ts --dry-run
 *     Resolves gender for every eligible word and prints what it would
 *     write, without touching the database.
 *
 *   npx tsx scripts/backfillWordGender.ts
 *     Same, but actually writes the resolved gender back.
 *
 * Reads credentials from .env.local via ./loadEnv, same as the app itself.
 */
import './loadEnv';
import { createClient } from '@supabase/supabase-js';
import { resolveGender } from '../src/lib/genderApi';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in the environment.');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');

// Wikidata is a shared public service -- a small pause between lookups is
// polite and costs nothing noticeable at this scale (a few hundred words).
const LOOKUP_DELAY_MS = 150;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

  const { data: words, error } = await supabase
    .from('words')
    .select('id, language_id, text')
    .in('language_id', ['de', 'fr'])
    .is('gender', null)
    .order('id', { ascending: true });
  if (error) throw error;

  console.log(`${words.length} word(s) with no gender set yet. Resolving...`);

  let resolved = 0;
  let unresolved = 0;

  for (const word of words) {
    const gender = await resolveGender(word.text, word.language_id);
    if (gender) {
      resolved++;
      console.log(`  ${word.text} -> ${gender}`);
      if (!DRY_RUN) {
        const { error: updateError } = await supabase
          .from('words')
          .update({ gender })
          .eq('id', word.id);
        if (updateError) throw updateError;
      }
    } else {
      unresolved++;
    }
    await sleep(LOOKUP_DELAY_MS);
  }

  console.log(
    `\nDone${DRY_RUN ? ' (dry run, nothing written)' : ''}. Resolved ${resolved}, left unresolved ${unresolved} (not a noun, or Wikidata has no gender data for it -- those will show the "gender?" flag once tagged as a noun).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
