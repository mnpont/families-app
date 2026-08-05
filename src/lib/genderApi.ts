import type { Gender, LanguageId } from '../types/models';
import { GENDER_LANGUAGES, parseGenderFromArticle } from '../utils/parseGender';

/**
 * Live grammatical-gender/number lookup against Wikidata's Lexeme data --
 * free, keyless, CORS-open (same posture as MyMemory in lookupApi.ts, see
 * that file's header comment). Used only when a noun's own text doesn't
 * unambiguously signal gender: no article at all, or an article shared
 * across genders/plural (German "die", French "l'").
 *
 * This is always a best-effort suggestion -- a miss or a network failure
 * just leaves gender unresolved (the "gender?" flag), never blocks saving
 * the word itself.
 */

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

/** Wikidata QID for each target language's lexeme-language facet. */
const LANGUAGE_QIDS: Partial<Record<LanguageId, string>> = { de: 'Q188', fr: 'Q150' };

const NOUN_QID = 'Q1084';
const GENDER_PROPERTY = 'P5185';
const PLURAL_FEATURE_QID = 'Q146786';

const GENDER_LABEL_MAP: Record<string, Gender> = {
  masculine: 'masc',
  feminine: 'fem',
  neuter: 'neutr',
};

function escapeForSparqlString(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

interface SparqlBinding {
  genderLabel?: { value: string };
  isPlural?: { value: string };
}

/**
 * Looks up the grammatical gender of `text` as a noun in `languageId`, or
 * 'plural' if it matches an inflected plural form instead of a lemma
 * (plural nouns don't carry their own gender -- see the "Schulden" case in
 * the migration/design notes). Returns null on no match or any failure.
 */
export async function lookupGender(text: string, languageId: LanguageId): Promise<Gender | null> {
  const languageQid = LANGUAGE_QIDS[languageId];
  const word = escapeForSparqlString(text.trim());
  if (!languageQid || !word) return null;

  const query = `SELECT ?genderLabel ?isPlural WHERE {
  {
    ?lexeme dct:language wd:${languageQid} ;
            wikibase:lemma "${word}"@${languageId} ;
            wikibase:lexicalCategory wd:${NOUN_QID} ;
            wdt:${GENDER_PROPERTY} ?gender .
  }
  UNION
  {
    ?lexeme2 dct:language wd:${languageQid} ;
             wikibase:lexicalCategory wd:${NOUN_QID} ;
             ontolex:lexicalForm ?form .
    ?form ontolex:representation "${word}"@${languageId} ;
          wikibase:grammaticalFeature wd:${PLURAL_FEATURE_QID} .
    BIND(true AS ?isPlural)
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 5`;

  try {
    const response = await fetch(`${SPARQL_ENDPOINT}?${new URLSearchParams({ query, format: 'json' })}`, {
      headers: {
        Accept: 'application/sparql-results+json',
        // Wikimedia's API etiquette policy 403s requests with no descriptive
        // User-Agent. Browsers silently ignore this (it's a forbidden header
        // there, and the browser's own UA already satisfies the policy) --
        // this only matters for non-browser callers (scripts/backfillWordGender.ts).
        'User-Agent': 'families-app/1.0 (personal vocabulary tracker; gender lookup)',
      },
    });
    if (!response.ok) return null;

    const data: { results?: { bindings: SparqlBinding[] } } = await response.json();
    const bindings = data.results?.bindings ?? [];

    const genderLabel = bindings.find((b) => b.genderLabel)?.genderLabel?.value;
    if (genderLabel && GENDER_LABEL_MAP[genderLabel]) return GENDER_LABEL_MAP[genderLabel];

    if (bindings.some((b) => b.isPlural?.value === 'true')) return 'plural';

    return null;
  } catch (error) {
    console.error(`Error looking up gender for "${text}":`, error);
    return null;
  }
}

/**
 * Whether a word is even a candidate for gender resolution/display: true
 * when part_of_speech is unset (the common case -- most words are never
 * explicitly tagged) or explicitly 'noun'. An explicit non-noun tag (verb,
 * adjective, phrase, other) always wins over anything Wikidata says --
 * needed because a lemma can coincidentally have an obscure noun sense
 * Wikidata knows about even when the word was entered as a different part
 * of speech (e.g. French "manger" is usually the verb "to eat", but also
 * has a rare masculine noun sense meaning "food").
 */
export function isGenderEligible(partOfSpeech: string | null | undefined): boolean {
  return partOfSpeech == null || partOfSpeech === 'noun';
}

/**
 * Resolves the gender to store for a word: the free, no-network article
 * parse first, then a live lookup only when the article is missing or
 * ambiguous. Deliberately NOT gated on part_of_speech having been filled
 * in -- requiring that first would just move the "I forgot to fill
 * something in" problem this exists to solve -- except when it's
 * explicitly set to something other than 'noun' (see isGenderEligible).
 */
export async function resolveGender(
  text: string,
  languageId: LanguageId,
  partOfSpeech: string | null = null
): Promise<Gender | null> {
  if (!GENDER_LANGUAGES.includes(languageId) || !isGenderEligible(partOfSpeech)) return null;

  const fromArticle = parseGenderFromArticle(text, languageId);
  if (fromArticle && fromArticle !== 'ambiguous') return fromArticle;

  return lookupGender(text, languageId);
}
