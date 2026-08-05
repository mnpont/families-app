import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/**
 * Core sentence-generation logic shared by generate-example-sentence
 * (called once, right after a Word is created) and batch-generate-sentences
 * (a manual catch-up pass over Words that predate this function, or that
 * failed on their first attempt). Kept in one place so both stay in sync
 * with the current schema (migrations/001-007) instead of drifting the way
 * the old pre-restructure functions did -- see git history around
 * migrations/002_rename_legacy_words_table.sql for that story.
 */

export interface WordForGeneration {
  id: number;
  language_id: string;
  text: string;
}

export interface GeneratedSentence {
  wordId: number;
  languageId: string;
  text: string;
  translationText: string;
}

const OPENAI_MODEL = "gpt-4o-mini";

function buildPrompt(
  wordText: string,
  targetLanguageName: string,
  translationText: string,
  translationLanguageName: string
): string {
  return `You are a ${targetLanguageName} language tutor. Given the ${targetLanguageName} word/phrase "${wordText}" (${translationLanguageName} translation: "${translationText}"), generate ONE simple example sentence in ${targetLanguageName} using this word/phrase naturally, and its ${translationLanguageName} translation.

Rules:
- A2-B1 level difficulty
- Use the word/phrase naturally in context
- Keep it short (under 15 words)
- Return ONLY valid JSON: {"sentence": "...", "translation": "..."}`;
}

async function callOpenAI(
  prompt: string,
  apiKey: string
): Promise<{ sentence: string; translation: string }> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 150,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  if (!parsed.sentence || !parsed.translation) {
    throw new Error(`OpenAI response missing sentence/translation: ${JSON.stringify(parsed)}`);
  }
  return parsed;
}

/**
 * Generates and stores one example sentence for a single Word, reading its
 * primary Translation and both languages' display names to keep the prompt
 * generic across every language in `languages` (not hardcoded to German,
 * unlike the function this replaces). No-ops and returns the existing row
 * if one is already there, so it's safe to call more than once for the same
 * word -- e.g. a batch backfill re-covering a word the per-add path already
 * handled.
 */
export async function generateAndStoreSentence(
  supabase: SupabaseClient,
  word: WordForGeneration
): Promise<GeneratedSentence> {
  const { data: existing, error: existingError } = await supabase
    .from("example_sentences")
    .select("word_id, language_id, text, translation_text")
    .eq("word_id", word.id)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    return {
      wordId: existing.word_id,
      languageId: existing.language_id,
      text: existing.text,
      translationText: existing.translation_text,
    };
  }

  const { data: translation, error: translationError } = await supabase
    .from("translations")
    .select("text, language_id")
    .eq("word_id", word.id)
    .eq("is_primary", true)
    .maybeSingle();
  if (translationError) throw translationError;
  if (!translation) throw new Error(`Word ${word.id} has no primary translation`);

  const { data: languages, error: languagesError } = await supabase
    .from("languages")
    .select("id, name")
    .in("id", [word.language_id, translation.language_id]);
  if (languagesError) throw languagesError;

  const targetLanguageName =
    languages?.find((l) => l.id === word.language_id)?.name ?? word.language_id;
  const translationLanguageName =
    languages?.find((l) => l.id === translation.language_id)?.name ?? translation.language_id;

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) throw new Error("OPENAI_API_KEY is not set");

  const prompt = buildPrompt(word.text, targetLanguageName, translation.text, translationLanguageName);
  const { sentence, translation: translationSentence } = await callOpenAI(prompt, openaiKey);

  const { data: inserted, error: insertError } = await supabase
    .from("example_sentences")
    .insert({
      word_id: word.id,
      language_id: word.language_id,
      text: sentence,
      translation_text: translationSentence,
    })
    .select("word_id, language_id, text, translation_text")
    .single();
  if (insertError) throw insertError;

  return {
    wordId: inserted.word_id,
    languageId: inserted.language_id,
    text: inserted.text,
    translationText: inserted.translation_text,
  };
}
