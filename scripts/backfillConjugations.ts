/**
 * One-time backfill for words.conjugations
 * (migrations/016_add_words_conjugations.sql): runs the same verb detection
 * the generate-conjugations Edge Function runs on every add/edit over every
 * existing French word that predates it. Detected verbs get their
 * conjugation table stored, and are tagged part_of_speech = 'verb' if they
 * had no type yet -- which is most of them, since nothing set
 * part_of_speech automatically before this. Can be re-run safely any time:
 * it only looks at words whose conjugations are still null.
 *
 * Runs the detection locally rather than calling the Edge Function, so the
 * dry run needs nothing deployed: supabase/functions/_shared/
 * conjugationCore.ts is shared verbatim, and the library comes from
 * devDependencies pinned to the Edge Function's versions (see
 * ./frenchConjugator.ts).
 *
 * Usage:
 *
 *   npm run backfill:conjugations-dry-run
 *     Lists every word it would tag as a verb (and every verb-typed word
 *     the dictionary doesn't know), without touching the database.
 *
 *   npm run backfill:conjugations-live
 *     Same, but actually writes.
 *
 * Reads credentials from .env.local via ./loadEnv, same as the app itself.
 */
import './loadEnv';
import { createClient } from '@supabase/supabase-js';
import {
  CONJUGATION_LANGUAGES,
  planConjugationUpdate,
  type WordForConjugation,
} from '../supabase/functions/_shared/conjugationCore';
import { loadFrenchConjugator } from './frenchConjugator';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in the environment.');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
  const conjugator = loadFrenchConjugator();

  const { data: words, error } = await supabase
    .from('words')
    .select('id, language_id, text, part_of_speech, conjugations')
    .in('language_id', CONJUGATION_LANGUAGES)
    .is('conjugations', null)
    .order('id', { ascending: true });
  if (error) throw error;

  console.log(`${words.length} word(s) with no conjugations yet. Detecting verbs...\n`);

  const tagged: string[] = [];
  const alreadyVerbs: string[] = [];
  const verbTypedNotFound: string[] = [];

  for (const word of words as WordForConjugation[]) {
    const plan = planConjugationUpdate(word, conjugator);

    if (plan.action === 'none') {
      if (plan.taggedVerbNotFound) verbTypedNotFound.push(`${word.text} (${plan.reason})`);
      continue;
    }
    // Only 'store' is possible here: 'clear' needs existing conjugations,
    // and this query only selected words without any.
    if (plan.action !== 'store') continue;

    (plan.tagAsVerb ? tagged : alreadyVerbs).push(word.text);

    if (!DRY_RUN) {
      const { error: updateError } = await supabase
        .from('words')
        .update({
          conjugations: plan.conjugations,
          // Same as the Edge Function: tagging it a verb also drops a gender
          // a Wikidata noun sense of the same spelling may have attached.
          ...(plan.tagAsVerb ? { part_of_speech: 'verb', gender: null } : {}),
        })
        .eq('id', word.id);
      if (updateError) throw updateError;
    }
  }

  console.log(`Would tag as verbs (had no word type) -- ${tagged.length}:`);
  for (const text of tagged) console.log(`  ${text}`);
  console.log(`\nAlready typed 'verb', conjugations added -- ${alreadyVerbs.length}:`);
  for (const text of alreadyVerbs) console.log(`  ${text}`);
  console.log(
    `\nTyped 'verb' but not conjugatable, left untouched -- ${verbTypedNotFound.length}:`,
  );
  for (const text of verbTypedNotFound) console.log(`  ${text}`);

  console.log(
    `\nDone${DRY_RUN ? ' (dry run, nothing written)' : ''}. A noun saved without its article (e.g. "dîner") is indistinguishable from the infinitive and gets tagged as a verb -- change its type in Edit Word and it drops out of the drill.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
