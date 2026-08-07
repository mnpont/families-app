import { createClient } from "npm:@supabase/supabase-js@2";
import { refreshDistractors } from "../_shared/generateDistractors.ts";

/**
 * Called in the background right after a Word is graded in Practice
 * (src/lib/vocabularyApi.ts refreshDistractorsInBackground(), fired from
 * src/hooks/usePracticeSession.ts) -- never awaited by the UI. Swaps in a
 * fresh distractor set that avoids repeating the one just shown, so by the
 * time this word is due again, a different set is already sitting there
 * instead of the exact same three wrong options every time.
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

    const result = await refreshDistractors(supabase, word);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("refresh-distractors failed:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
