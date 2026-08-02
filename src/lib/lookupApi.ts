import type { LanguageId } from '../types/models';

/**
 * Optional "I don't already know this word" lookup assist (docs/v2-plan.md
 * Phase 1 Step 3) -- calls MyMemory's translation API directly from the
 * browser. No API key needed: MyMemory's endpoint is anonymous and
 * CORS-open (`access-control-allow-origin: *`), so unlike a paid/keyed
 * provider this doesn't need a server-side proxy to keep a secret hidden.
 *
 * This is always a suggestion, never an authority -- callers must let the
 * result be freely edited before saving (see AddWordModal), same as any
 * manually-typed translation.
 */

const MYMEMORY_ENDPOINT = 'https://api.mymemory.translated.net/get';

/**
 * Gloss language MyMemory translates into. English by default, matching
 * the app's existing translation-language convention (detectTranslationLanguage.ts);
 * falls back to Spanish for a word whose own language already is English,
 * since "translate English into English" isn't meaningful.
 */
function targetLanguageFor(sourceLanguageId: LanguageId): LanguageId {
  return sourceLanguageId === 'en' ? 'es' : 'en';
}

interface MyMemoryResponse {
  responseStatus: number | string;
  responseData?: { translatedText?: string };
}

/**
 * Returns a suggested translation for `text` in `languageId`, or null if no
 * usable suggestion came back. Only throws for a genuine network/HTTP
 * failure -- "no match" is a normal, expected outcome (e.g. an obscure
 * word, or a language MyMemory doesn't cover well), not an error.
 */
export async function lookupTranslation(text: string, languageId: LanguageId): Promise<string | null> {
  const targetLanguageId = targetLanguageFor(languageId);
  const params = new URLSearchParams({ q: text, langpair: `${languageId}|${targetLanguageId}` });

  const response = await fetch(`${MYMEMORY_ENDPOINT}?${params.toString()}`);
  if (!response.ok) throw new Error(`Lookup request failed: ${response.status}`);

  const data: MyMemoryResponse = await response.json();
  if (Number(data.responseStatus) !== 200) return null;

  const suggestion = data.responseData?.translatedText?.trim();
  return suggestion || null;
}
