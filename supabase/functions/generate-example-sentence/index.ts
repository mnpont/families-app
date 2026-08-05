import { createClient } from "npm:@supabase/supabase-js@2";
import { generateAndStoreSentence } from "../_shared/generateSentence.ts";

/**
 * Called once, right after a Word is created (src/lib/vocabularyApi.ts
 * createWord()), so every new word gets an example sentence the same way
 * this app originally worked -- before the Phase 0 restructure orphaned the
 * old German-only version of this function against a schema it no longer
 * matched (git history: migrations/002_rename_legacy_words_table.sql).
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
      .select("id, language_id, text")
      .eq("id", wordId)
      .single();
    if (wordError) throw wordError;

    const sentence = await generateAndStoreSentence(supabase, word);

    return new Response(JSON.stringify(sentence), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-example-sentence failed:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
