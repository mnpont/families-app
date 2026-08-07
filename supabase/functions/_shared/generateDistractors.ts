import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/**
 * Core distractor-generation logic shared by generate-distractors (called
 * once, right after a Word is created) and batch-generate-distractors (a
 * manual catch-up pass over Words that predate this function, or whose
 * per-add call failed). Mirrors _shared/generateSentence.ts's structure and
 * its idempotent no-op-if-already-there behavior.
 *
 * Distractors are generated ONCE per word and cached on
 * words.llm_distractors (migrations/015_add_words_llm_distractors.sql), not
 * regenerated on every Practice session -- the same "generate once, cache"
 * design as example sentences, and for the same reason: cost/latency should
 * scale with vocabulary size, not with review volume. A missing or failed
 * generation is never fatal -- src/utils/pickDistractors.ts's deck/length/
 * part-of-speech heuristic covers any word that doesn't have LLM distractors
 * yet, and this function's caller (src/lib/vocabularyApi.ts createWord)
 * treats a failure here as best-effort, same as sentence generation.
 */

export interface WordForDistractorGeneration {
  id: number;
  language_id: string;
  text: string;
}

export interface GeneratedDistractors {
  wordId: number;
  distractors: string[];
}

const OPENAI_MODEL = "gpt-4o-mini";
const DISTRACTOR_COUNT = 3;

function buildPrompt(
  wordText: string,
  targetLanguageName: string,
  correctTranslation: string,
  translationLanguageName: string,
  deckName: string | null
): string {
  const topicIntro = deckName ? `, from the topic "${deckName}"` : "";
  const topicRule = deckName
    ? `- Related to the same topic ("${deckName}") when plausible, so they're tempting, not random.\n`
    : "";

  return `You are a ${targetLanguageName}-to-${translationLanguageName} language-learning quiz writer.

Given the ${targetLanguageName} word/phrase "${wordText}" (correct ${translationLanguageName} translation: "${correctTranslation}")${topicIntro}, generate exactly ${DISTRACTOR_COUNT} plausible-but-incorrect ${translationLanguageName} translations to use as multiple-choice distractors.

Rules:
- Each distractor must be a genuinely different meaning from "${correctTranslation}" -- not a synonym, near-synonym, or acceptable alternate translation.
- Similar length, register, and grammatical form to the correct translation (a short phrase gets short-phrase distractors; a single word gets single-word distractors).
- Match sentence type/mood exactly: if the correct translation is a question, all ${DISTRACTOR_COUNT} distractors must also be phrased as questions (same for exclamations or commands) -- the correct answer should never be identifiable just because it's the only one with a "?" or "!".
${topicRule}- No duplicates of each other or of the correct translation.
- A2-B1 level vocabulary, matching this app's existing example sentences.
- Return ONLY valid JSON: {"distractors": ["...", "...", "..."]}`;
}

async function callOpenAI(prompt: string, apiKey: string): Promise<unknown[]> {
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
  if (!Array.isArray(parsed.distractors)) {
    throw new Error(`OpenAI response missing distractors array: ${JSON.stringify(parsed)}`);
  }
  return parsed.distractors;
}

/** Trims, drops empties, and dedupes case-insensitively against the correct answer and each other. */
function sanitizeDistractors(raw: unknown[], correctTranslation: string): string[] {
  const seen = new Set<string>([correctTranslation.trim().toLowerCase()]);
  const cleaned: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    const lower = trimmed.toLowerCase();
    if (!trimmed || seen.has(lower)) continue;
    seen.add(lower);
    cleaned.push(trimmed);
  }
  return cleaned;
}

/**
 * One word can technically belong to more than one deck (deck_words is a
 * join table), but this is just prompt-grounding context, not a source of
 * truth -- picking whichever deck comes back first is fine. A word with no
 * deck yet gets a topic-free prompt (see buildPrompt's `deckName` handling).
 */
async function fetchDeckName(supabase: SupabaseClient, wordId: number): Promise<string | null> {
  const { data } = await supabase
    .from("deck_words")
    .select("decks(name)")
    .eq("word_id", wordId)
    .limit(1)
    .maybeSingle();
  const row = data as { decks: { name: string } | null } | null;
  return row?.decks?.name ?? null;
}

/**
 * Generates and stores up to DISTRACTOR_COUNT distractors for a single Word.
 * No-ops and returns the existing row if distractors are already stored, so
 * it's safe to call more than once for the same word (a batch backfill
 * re-covering a word the per-add path already handled).
 */
export async function generateAndStoreDistractors(
  supabase: SupabaseClient,
  word: WordForDistractorGeneration
): Promise<GeneratedDistractors> {
  const { data: existingWord, error: existingError } = await supabase
    .from("words")
    .select("llm_distractors")
    .eq("id", word.id)
    .single();
  if (existingError) throw existingError;
  if (existingWord?.llm_distractors && existingWord.llm_distractors.length > 0) {
    return { wordId: word.id, distractors: existingWord.llm_distractors };
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

  const deckName = await fetchDeckName(supabase, word.id);

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) throw new Error("OPENAI_API_KEY is not set");

  const prompt = buildPrompt(word.text, targetLanguageName, translation.text, translationLanguageName, deckName);
  const rawDistractors = await callOpenAI(prompt, openaiKey);
  const distractors = sanitizeDistractors(rawDistractors, translation.text);

  if (distractors.length === 0) {
    throw new Error(`OpenAI returned no usable distractors for word ${word.id}: ${JSON.stringify(rawDistractors)}`);
  }

  const { error: updateError } = await supabase
    .from("words")
    .update({ llm_distractors: distractors })
    .eq("id", word.id);
  if (updateError) throw updateError;

  return { wordId: word.id, distractors };
}
