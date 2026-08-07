import { createClient } from "npm:@supabase/supabase-js@2";
import { generateAndStoreDistractors } from "../_shared/generateDistractors.ts";

/**
 * Called once, right after a Word is created (src/lib/vocabularyApi.ts
 * createWord()), alongside generate-example-sentence -- same trigger point,
 * same best-effort contract (a failure here never blocks saving the word).
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

    const result = await generateAndStoreDistractors(supabase, word);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-distractors failed:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
