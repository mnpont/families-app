import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/**
 * Core distractor-generation logic shared by three Edge Functions:
 * generate-distractors (called once, right after a Word is created),
 * batch-generate-distractors (a manual catch-up pass over Words that
 * predate this feature), and refresh-distractors (called after a Word is
 * graded in Practice, to swap in a fresh set for its NEXT appearance).
 *
 * Distractors are cached on words.llm_distractors
 * (migrations/015_add_words_llm_distractors.sql) rather than generated live
 * in front of the learner -- a word always serves whatever's currently
 * stored, instantly. What keeps that from going stale forever (a learner
 * memorizing "the answer is whichever one isn't X/Y/Z" instead of actually
 * recalling the word) is refresh-distractors: fired in the background right
 * after grading, well before the word is due again, so its next appearance
 * already has a different set waiting -- see src/hooks/usePracticeSession.ts.
 * A missing or failed generation is never fatal either way --
 * src/utils/pickDistractors.ts's deck/length/part-of-speech heuristic covers
 * any word that doesn't have (enough) LLM distractors at a given moment.
 *
 * Every generation call also double-checks the correct translation itself
 * for missing accents/diacritics or capitalization slips (e.g. a learner
 * typing "El" when Spanish grammar requires "Él") and, when it's confident
 * the fix is spelling-only (see applyTranslationCorrection's guard), applies
 * it to translations.text -- otherwise a typo in the user's own entry reads
 * as a giveaway next to correctly-accented distractors, the opposite
 * problem this whole feature exists to prevent.
 */

export interface WordForDistractorGeneration {
  id: number;
  language_id: string;
  text: string;
}

export interface GeneratedDistractors {
  wordId: number;
  distractors: string[];
  /** Set only when a spelling/diacritic correction was actually applied to translations.text. */
  correctedTranslation?: string;
}

const OPENAI_MODEL = "gpt-4o-mini";
const DISTRACTOR_COUNT = 3;

function buildPrompt(
  wordText: string,
  targetLanguageName: string,
  correctTranslation: string,
  translationLanguageName: string,
  deckName: string | null,
  avoid: string[]
): string {
  const topicIntro = deckName ? `, from the topic "${deckName}"` : "";
  const topicRule = deckName
    ? `- Related to the same topic ("${deckName}") when plausible, so they're tempting, not random.\n`
    : "";
  const avoidRule =
    avoid.length > 0
      ? `- Do not reuse any of these previously-used distractors -- generate genuinely different ones: ${avoid
          .map((text) => `"${text}"`)
          .join(", ")}.\n`
      : "";

  return `You are a ${targetLanguageName}-to-${translationLanguageName} language-learning quiz writer.

Given the ${targetLanguageName} word/phrase "${wordText}" (correct ${translationLanguageName} translation: "${correctTranslation}")${topicIntro}, generate exactly ${DISTRACTOR_COUNT} plausible-but-incorrect ${translationLanguageName} translations to use as multiple-choice distractors.

Rules:
- Each distractor must be a genuinely different meaning from "${correctTranslation}" -- not a synonym, near-synonym, or acceptable alternate translation.
- Similar length, register, and grammatical form to the correct translation (a short phrase gets short-phrase distractors; a single word gets single-word distractors).
- Match sentence type/mood exactly: if the correct translation is a question, all ${DISTRACTOR_COUNT} distractors must also be phrased as questions (same for exclamations or commands) -- the correct answer should never be identifiable just because it's the only one with a "?" or "!".
${avoidRule}${topicRule}- No duplicates of each other or of the correct translation.
- A2-B1 level vocabulary, matching this app's existing example sentences.

Also proofread the correct translation "${correctTranslation}" itself: if it's missing accents/diacritics or has a capitalization mistake (common with quick typing -- e.g. Spanish "El" written instead of "Él"), return a corrected version in "correctedTranslation". Fix ONLY spelling, accents, and capitalization -- never reword or rephrase. If it's already correct, return it completely unchanged.

Return ONLY valid JSON: {"distractors": ["...", "...", "..."], "correctedTranslation": "..."}`;
}

async function callOpenAI(
  prompt: string,
  apiKey: string
): Promise<{ distractors: unknown[]; correctedTranslation: unknown }> {
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
      max_tokens: 220,
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
  return { distractors: parsed.distractors, correctedTranslation: parsed.correctedTranslation };
}

/**
 * Trims, drops empties, and dedupes case-insensitively against the correct
 * answer, `avoid` (the outgoing set, on a refresh), and each other. This is
 * the defensive backstop for the prompt's "don't reuse these" rule -- never
 * trust the model to fully obey an instruction when a plain filter can just
 * guarantee it.
 */
function sanitizeDistractors(raw: unknown[], correctTranslation: string, avoid: string[]): string[] {
  const seen = new Set<string>([correctTranslation, ...avoid].map((text) => text.trim().toLowerCase()));
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

/** Lowercased, accent-stripped comparison key -- "El" and "Él" both normalize to "el". */
function spellingKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Decides whether the model's suggested `correctedTranslation` is safe to
 * apply: only when it's the SAME word once accents/case are stripped (so
 * "El" -> "Él" passes, but any real wording change -- a different word, a
 * rephrase -- is rejected, no matter how minor it looks). Returns null when
 * no correction is warranted or safe.
 */
function resolveSafeCorrection(original: string, rawCorrected: unknown): string | null {
  if (typeof rawCorrected !== "string") return null;
  const corrected = rawCorrected.trim();
  if (!corrected || corrected === original) return null;
  return spellingKey(corrected) === spellingKey(original) ? corrected : null;
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

/** Everything needed to build a prompt for a word, fetched once and shared by both the first-generation and refresh paths. */
async function fetchGenerationContext(supabase: SupabaseClient, word: WordForDistractorGeneration) {
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

  return { correctTranslation: translation.text, targetLanguageName, translationLanguageName, deckName };
}

interface DistractorGenerationResult {
  distractors: string[];
  /** Non-null only when resolveSafeCorrection accepted the model's suggestion. */
  correctedTranslation: string | null;
}

/** Builds and sanitizes one fresh distractor set, avoiding `avoid`. Doesn't touch the database. */
async function generateDistractorSet(
  supabase: SupabaseClient,
  word: WordForDistractorGeneration,
  avoid: string[]
): Promise<DistractorGenerationResult> {
  const ctx = await fetchGenerationContext(supabase, word);

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) throw new Error("OPENAI_API_KEY is not set");

  const prompt = buildPrompt(
    word.text,
    ctx.targetLanguageName,
    ctx.correctTranslation,
    ctx.translationLanguageName,
    ctx.deckName,
    avoid
  );
  const { distractors: rawDistractors, correctedTranslation: rawCorrected } = await callOpenAI(prompt, openaiKey);

  const correctedTranslation = resolveSafeCorrection(ctx.correctTranslation, rawCorrected);
  const distractorAvoid = correctedTranslation ? [...avoid, correctedTranslation] : avoid;
  const distractors = sanitizeDistractors(rawDistractors, ctx.correctTranslation, distractorAvoid);

  return { distractors, correctedTranslation };
}

/**
 * Applies a spelling/accent/capitalization-only fix to a word's primary
 * translation. Never called with anything but a correction
 * resolveSafeCorrection has already verified is the same word -- this never
 * rewrites wording. Best-effort: a failure here doesn't affect distractor
 * generation, which has already succeeded by the time this runs.
 */
async function applyTranslationCorrection(
  supabase: SupabaseClient,
  wordId: number,
  correctedText: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from("translations")
      .update({ text: correctedText })
      .eq("word_id", wordId)
      .eq("is_primary", true);
    if (error) throw error;
  } catch (error) {
    console.error(`Error applying translation correction for word ${wordId}:`, error);
  }
}

/**
 * Generates and stores up to DISTRACTOR_COUNT distractors for a single Word.
 * No-ops and returns the existing row if distractors are already stored, so
 * it's safe to call more than once for the same word (a batch backfill
 * re-covering a word the per-add path already handled). Use
 * refreshDistractors instead when you want a genuinely new set.
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

  const { distractors, correctedTranslation } = await generateDistractorSet(supabase, word, []);
  if (distractors.length === 0) {
    throw new Error(`OpenAI returned no usable distractors for word ${word.id}`);
  }

  const { error: updateError } = await supabase
    .from("words")
    .update({ llm_distractors: distractors })
    .eq("id", word.id);
  if (updateError) throw updateError;

  if (correctedTranslation) {
    await applyTranslationCorrection(supabase, word.id, correctedTranslation);
  }

  return { wordId: word.id, distractors, ...(correctedTranslation ? { correctedTranslation } : {}) };
}

/**
 * Replaces a word's distractors with a fresh set that avoids repeating the
 * ones just shown (fetched from the row itself, not passed in, so the
 * caller doesn't need to know them). Meant to be called right after a word
 * is graded in Practice -- by the time it's due again, a different set is
 * already waiting, with no latency in front of the learner either time
 * (src/hooks/usePracticeSession.ts fires this in the background).
 *
 * If generation fails or comes back with nothing usable, the word's
 * existing distractors are left untouched -- a stale set beats none at all,
 * and src/utils/pickDistractors.ts's heuristic tops up the rest either way.
 */
export async function refreshDistractors(
  supabase: SupabaseClient,
  word: WordForDistractorGeneration
): Promise<GeneratedDistractors> {
  const { data: existingWord, error: existingError } = await supabase
    .from("words")
    .select("llm_distractors")
    .eq("id", word.id)
    .single();
  if (existingError) throw existingError;
  const previous = existingWord?.llm_distractors ?? [];

  const { distractors, correctedTranslation } = await generateDistractorSet(supabase, word, previous);
  if (distractors.length === 0) {
    return { wordId: word.id, distractors: previous };
  }

  const { error: updateError } = await supabase
    .from("words")
    .update({ llm_distractors: distractors })
    .eq("id", word.id);
  if (updateError) throw updateError;

  if (correctedTranslation) {
    await applyTranslationCorrection(supabase, word.id, correctedTranslation);
  }

  return { wordId: word.id, distractors, ...(correctedTranslation ? { correctedTranslation } : {}) };
}
