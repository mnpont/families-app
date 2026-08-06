import type { Gender, LanguageId } from '../types/models';

/**
 * Languages known to mark grammatical gender, used ONLY to decide whether
 * to show the amber "gender?" flag for an unresolved noun (src/components/
 * ExpandedFamilyModal.tsx) -- without it, a noun in a genderless language
 * (e.g. English) would get permanently flagged as "missing" a gender that
 * doesn't exist for it. This is a cosmetic hint, not a correctness gate:
 * src/lib/genderApi.ts's actual resolution never checks this list, it
 * resolves any language dynamically via Wikidata and simply finds nothing
 * for a genderless one. Omitting a real gendered language here just means
 * its unresolved nouns don't get flagged -- resolution itself still works.
 */
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

export const GENDER_LABELS: Record<Gender, string> = {
  masc: 'masc.',
  fem: 'fem.',
  neutr: 'neutr.',
  plural: 'pl.',
};
