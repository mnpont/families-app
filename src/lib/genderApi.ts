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
      headers: { Accept: 'application/sparql-results+json' },
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
 * Resolves the gender to store for a word: the free, no-network article
 * parse first, then a live lookup only when the article is missing or
 * ambiguous. Only attempted for nouns in a language that marks gender --
 * everything else resolves to null without a network call.
 */
export async function resolveGender(
  text: string,
  languageId: LanguageId,
  partOfSpeech: string | null
): Promise<Gender | null> {
  if (partOfSpeech !== 'noun' || !GENDER_LANGUAGES.includes(languageId)) return null;

  const fromArticle = parseGenderFromArticle(text, languageId);
  if (fromArticle && fromArticle !== 'ambiguous') return fromArticle;

  return lookupGender(text, languageId);
}
