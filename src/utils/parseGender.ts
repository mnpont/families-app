import type { Gender, LanguageId } from '../types/models';

/** Target languages this app currently supports that mark grammatical gender on nouns. English/Spanish are gloss-only (migrations/013), so they never reach here. */
export const GENDER_LANGUAGES: LanguageId[] = ['de', 'fr'];

/**
 * Article lookup result. 'ambiguous' means the article is present but
 * doesn't decide it alone: German "die" covers both feminine singular and
 * every plural gender; French "l'" elides masculine/feminine before a
 * vowel. Callers should fall back to a live lookup (src/lib/genderApi.ts)
 * for 'ambiguous' or null.
 */
type ArticleResult = Gender | 'ambiguous' | null;

const ARTICLES: Partial<Record<LanguageId, Record<string, ArticleResult>>> = {
  // German indefinite "ein" is shared by masculine/neuter nominative
  // ("ein Mann", "ein Kind") -- only "eine" (feminine) is unambiguous.
  de: { der: 'masc', die: 'ambiguous', das: 'neutr', ein: 'ambiguous', eine: 'fem' },
  // French indefinite un/une are unambiguous, unlike definite le/la.
  fr: { le: 'masc', la: 'fem', les: 'plural', un: 'masc', une: 'fem' },
};

/** Reads the leading article off `text` -- a pure, free, no-network first pass before falling back to a live lookup. */
export function parseGenderFromArticle(text: string, languageId: LanguageId): ArticleResult {
  const articles = ARTICLES[languageId];
  if (!articles) return null;

  const firstWord = text.trim().split(/\s+/)[0]?.toLowerCase();
  if (!firstWord) return null;

  if (languageId === 'fr' && firstWord.startsWith("l'")) return 'ambiguous';

  return articles[firstWord] ?? null;
}

/**
 * Strips a recognized leading article off `text`, e.g. "die Verwaltung" ->
 * "Verwaltung", "ein Faultier" -> "Faultier". Needed before a live gender
 * lookup (src/lib/genderApi.ts): Wikidata's lemma is just the bare noun, so
 * a lookup for the un-stripped text (article included) never matches
 * anything. Derives its word list from ARTICLES so a new article added
 * there (as happened with "ein"/"eine"/"un"/"une") can't silently go
 * unstripped here.
 */
export function stripLeadingArticle(text: string, languageId: LanguageId): string {
  const trimmed = text.trim();
  const articles = ARTICLES[languageId];
  if (!articles) return trimmed;

  if (languageId === 'fr' && /^l['’]/i.test(trimmed)) {
    return trimmed.slice(trimmed.search(/['’]/) + 1).trim();
  }

  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) return trimmed;

  const firstWord = trimmed.slice(0, spaceIndex).toLowerCase();
  return firstWord in articles ? trimmed.slice(spaceIndex + 1).trim() : trimmed;
}

export const GENDER_LABELS: Record<Gender, string> = {
  masc: 'masc.',
  fem: 'fem.',
  neutr: 'neutr.',
  plural: 'pl.',
};
