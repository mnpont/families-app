import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { getConjugation } from "npm:french-verbs@5.4.0";
import { isHMuet } from "npm:french-contractions@5.4.0";
import lefffData from "npm:french-verbs-lefff@3.4.0/dist/conjugations.json" with { type: "json" };
import {
  applyLefffPatches,
  createFrenchConjugator,
  planConjugationUpdate,
  type ConjugationPlan,
  type GetConjugationFn,
  type LefffData,
  type WordForConjugation,
} from "./conjugationCore.ts";

/**
 * Supabase read/write side of conjugation generation, shared by
 * generate-conjugations (fired after a word is added or edited) and
 * batch-generate-conjugations (manual catch-up). The rules themselves --
 * detection, auxiliary, agreement, elision -- live in ./conjugationCore.ts,
 * which the Node backfill (scripts/backfillConjugations.ts) shares too.
 *
 * Unlike the sentence/distractor functions there's no LLM call here: forms
 * come from the rule-based french-verbs library over the Lefff dictionary
 * (~6 MB of JSON, parsed once per warm instance at module load -- ~70 ms,
 * ~35 MB heap in the edge-runtime; see docs/practice-hub-spec.md "Spike
 * results"). Versions are pinned to the same ones package.json pins for the
 * Node side, so both produce identical output.
 */

const lefff = lefffData as unknown as LefffData;
applyLefffPatches(lefff);

const conjugator = createFrenchConjugator({
  lefff,
  getConjugation: getConjugation as unknown as GetConjugationFn,
  isHMuet,
});

export const WORD_FOR_CONJUGATION_SELECT = "id, language_id, text, part_of_speech, conjugations";

/**
 * Plans and applies the update for one word. Returns the plan so callers can
 * report what happened. Tagging a word as a verb also clears any gender the
 * client-side Wikidata lookup (src/lib/genderApi.ts) may have attached from
 * a rare noun sense of the same spelling -- the same thing re-saving it as a
 * verb in Edit Word would do.
 */
export async function generateAndStoreConjugations(
  supabase: SupabaseClient,
  word: WordForConjugation
): Promise<ConjugationPlan> {
  const plan = planConjugationUpdate(word, conjugator);

  if (plan.action === "store") {
    const { error } = await supabase
      .from("words")
      .update({
        conjugations: plan.conjugations,
        ...(plan.tagAsVerb ? { part_of_speech: "verb", gender: null } : {}),
      })
      .eq("id", word.id);
    if (error) throw error;
  } else if (plan.action === "clear") {
    const { error } = await supabase.from("words").update({ conjugations: null }).eq("id", word.id);
    if (error) throw error;
  } else if (plan.taggedVerbNotFound) {
    console.warn(`Word ${word.id} ("${word.text}") is tagged 'verb' but has no conjugations: ${plan.reason}`);
  }

  return plan;
}
