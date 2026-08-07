import { createClient } from "npm:@supabase/supabase-js@2";
import { generateAndStoreDistractors, type WordForDistractorGeneration } from "../_shared/generateDistractors.ts";

/**
 * Manual catch-up pass for Words that don't have LLM distractors yet --
 * words added before generate-distractors existed, added while
 * OPENAI_API_KEY was unset, or whose per-add call failed. Invoke with an
 * empty body to sweep every language, or { languageId, limit } to scope it.
 * Not wired to run automatically -- call it from the Supabase dashboard (or
 * `supabase functions invoke`) whenever you want to check for gaps. Mirrors
 * batch-generate-sentences exactly.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_LIMIT = 50;

interface WordWithDistractors extends WordForDistractorGeneration {
  llm_distractors: string[] | null;
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

    let query = supabase.from("words").select("id, language_id, text, llm_distractors");
    if (languageId) query = query.eq("language_id", languageId);

    const { data: allWords, error } = await query;
    if (error) throw error;

    const missing = ((allWords ?? []) as WordWithDistractors[])
      .filter((w) => !w.llm_distractors || w.llm_distractors.length === 0)
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
        await generateAndStoreDistractors(supabase, word);
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
    console.error("batch-generate-distractors failed:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
