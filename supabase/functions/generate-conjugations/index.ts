import { createClient } from "npm:@supabase/supabase-js@2";
import {
  generateAndStoreConjugations,
  WORD_FOR_CONJUGATION_SELECT,
} from "../_shared/generateConjugations.ts";

/**
 * Called fire-and-forget right after a word is created or edited
 * (src/lib/vocabularyApi.ts createWord/updateWord), alongside
 * generate-example-sentence and generate-distractors. Detects whether the
 * word is a French verb and, if so, stores its full conjugation table in
 * words.conjugations (migration 016) and tags it 'verb' if it had no type.
 * A no-op for any language outside CONJUGATION_LANGUAGES.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { wordId } = await req.json();
    if (typeof wordId !== "number") {
      return new Response(JSON.stringify({ error: "wordId (number) is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: word, error: wordError } = await supabase
      .from("words")
      .select(WORD_FOR_CONJUGATION_SELECT)
      .eq("id", wordId)
      .single();
    if (wordError) throw wordError;

    const plan = await generateAndStoreConjugations(supabase, word);

    return new Response(
      JSON.stringify({
        wordId,
        action: plan.action,
        ...(plan.action === "store" ? { taggedAsVerb: plan.tagAsVerb } : { reason: plan.reason }),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-conjugations failed:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
