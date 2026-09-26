import { createClient } from "npm:@supabase/supabase-js@2";
import { CONJUGATION_LANGUAGES, type WordForConjugation } from "../_shared/conjugationCore.ts";
import {
  generateAndStoreConjugations,
  WORD_FOR_CONJUGATION_SELECT,
} from "../_shared/generateConjugations.ts";

/**
 * Manual catch-up pass: runs verb detection over every word in
 * CONJUGATION_LANGUAGES that has no conjugations yet -- words added before
 * generate-conjugations existed, or whose per-add call failed. Invoke with
 * an empty body, or { languageId, limit, force }. `force: true` also
 * regenerates words that already have conjugations (e.g. after a
 * CONJUGATIONS_VERSION bump). Not wired to run automatically.
 *
 * No LLM involved, so no rate-limit pause between words and a much higher
 * default limit than batch-generate-sentences. The first-time backfill is
 * scripts/backfillConjugations.ts (same core logic, with a dry run); this is
 * the server-side equivalent for later gaps.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_LIMIT = 500;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const limit = typeof body.limit === "number" ? body.limit : DEFAULT_LIMIT;
    const force = body.force === true;
    const languageIds =
      typeof body.languageId === "string"
        ? CONJUGATION_LANGUAGES.filter((id) => id === body.languageId)
        : CONJUGATION_LANGUAGES;

    if (languageIds.length === 0) {
      return new Response(
        JSON.stringify({ message: `${body.languageId} has no conjugation support`, processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let query = supabase
      .from("words")
      .select(WORD_FOR_CONJUGATION_SELECT)
      .in("language_id", languageIds)
      .order("id", { ascending: true })
      .limit(limit);
    if (!force) query = query.is("conjugations", null);

    const { data: words, error } = await query;
    if (error) throw error;

    const stored: string[] = [];
    const taggedAsVerb: string[] = [];
    const taggedVerbNotFound: string[] = [];
    const failures: { wordId: number; error: string }[] = [];

    for (const word of (words ?? []) as WordForConjugation[]) {
      try {
        const plan = await generateAndStoreConjugations(supabase, word);
        if (plan.action === "store") {
          stored.push(word.text);
          if (plan.tagAsVerb) taggedAsVerb.push(word.text);
        } else if (plan.action === "none" && plan.taggedVerbNotFound) {
          taggedVerbNotFound.push(word.text);
        }
      } catch (err) {
        console.error(`Failed for word ${word.id}:`, err);
        failures.push({ wordId: word.id, error: err instanceof Error ? err.message : String(err) });
      }
    }

    return new Response(
      JSON.stringify({
        checked: words?.length ?? 0,
        stored: stored.length,
        taggedAsVerb,
        taggedVerbNotFound,
        failures,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("batch-generate-conjugations failed:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
