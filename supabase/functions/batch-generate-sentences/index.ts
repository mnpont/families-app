import { createClient } from "npm:@supabase/supabase-js@2";
import { generateAndStoreSentence, type WordForGeneration } from "../_shared/generateSentence.ts";

/**
 * Manual catch-up pass for Words that don't have an example sentence yet --
 * words added while OPENAI_API_KEY was unset, added before
 * generate-example-sentence existed, or whose per-add call failed. Invoke
 * with an empty body to sweep every language, or { languageId, limit } to
 * scope it. Not wired to run automatically; call it from the Supabase
 * dashboard (or `supabase functions invoke`) whenever you want to check for
 * gaps.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_LIMIT = 50;

interface WordWithSentences extends WordForGeneration {
  example_sentences: { id: number }[] | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const limit = typeof body.limit === "number" ? body.limit : DEFAULT_LIMIT;
    const languageId = typeof body.languageId === "string" ? body.languageId : undefined;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // PostgREST embedded-resource filters constrain the child rows, not
    // whether the parent has any -- there's no direct "words with zero
    // example_sentences" filter to push down. At this app's scale (a
    // personal vocab list, low hundreds of words) fetching every word with
    // its embedded sentences and filtering client-side is simpler and
    // plenty fast.
    let query = supabase.from("words").select("id, language_id, text, example_sentences(id)");
    if (languageId) query = query.eq("language_id", languageId);

    const { data: allWords, error } = await query;
    if (error) throw error;

    const missing = ((allWords ?? []) as WordWithSentences[])
      .filter((w) => !w.example_sentences || w.example_sentences.length === 0)
      .slice(0, limit);

    if (missing.length === 0) {
      return new Response(JSON.stringify({ message: "All done!", processed: 0, remaining: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    const failures: { wordId: number; error: string }[] = [];

    for (const word of missing) {
      try {
        await generateAndStoreSentence(supabase, word);
        processed++;
        await new Promise((r) => setTimeout(r, 200)); // rate limit buffer
      } catch (err) {
        console.error(`Failed for word ${word.id}:`, err);
        failures.push({ wordId: word.id, error: err instanceof Error ? err.message : String(err) });
      }
    }

    return new Response(
      JSON.stringify({ processed, failures, remaining: "invoke again if needed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("batch-generate-sentences failed:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
