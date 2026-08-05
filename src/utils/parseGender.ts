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
  de: { der: 'masc', die: 'ambiguous', das: 'neutr' },
  fr: { le: 'masc', la: 'fem', les: 'plural' },
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

export const GENDER_LABELS: Record<Gender, string> = {
  masc: 'masc.',
  fem: 'fem.',
  neutr: 'neutr.',
  plural: 'pl.',
};
