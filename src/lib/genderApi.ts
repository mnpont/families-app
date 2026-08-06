import type { Gender, LanguageId } from '../types/models';
import { parseGenderFromArticle } from '../utils/parseGender';

/**
 * Live grammatical-gender/number lookup against Wikidata's Lexeme data --
 * free, keyless, CORS-open (same posture as MyMemory in lookupApi.ts, see
 * that file's header comment).
 *
 * Nothing here hardcodes which languages have grammatical gender or what
 * their Wikidata language item is: `resolveLanguageQid` looks that up from
 * `languageId` (an ISO 639-1 code, see src/types/models.ts) dynamically, so
 * adding a new language to this app (src/hooks/useLanguages.ts) doesn't
 * need a matching code change here -- it either works immediately (a real
 * gendered language) or is a harmless no-op (a language with no gender to
 * find). The small article lists in src/utils/parseGender.ts ARE hardcoded
 * (a closed, essentially permanent set of grammar words per language,
 * unlike vocabulary), but only as a zero-network optimization for the
 * clear-cut cases -- see the strip-and-retry fallback below for why an
 * incomplete list degrades to "one extra request" instead of "silently
 * wrong forever", which is what actually happened before (twice) with
 * "ein Faultier" and "brot".
 *
 * This is always a best-effort suggestion -- a miss or a network failure
 * just leaves gender unresolved (the "gender?" flag), never blocks saving
 * the word itself.
 */

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'families-app/1.0 (personal vocabulary tracker; gender lookup)';

const ISO_639_1_PROPERTY = 'P218';
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

async function sparqlSelect(query: string): Promise<{ bindings: Record<string, { value: string }>[] } | null> {
  try {
    const response = await fetch(`${SPARQL_ENDPOINT}?${new URLSearchParams({ query, format: 'json' })}`, {
      headers: {
        Accept: 'application/sparql-results+json',
        // Wikimedia's API etiquette policy 403s requests with no descriptive
        // User-Agent. Browsers silently ignore this (it's a forbidden header
        // there, and the browser's own UA already satisfies the policy) --
        // this only matters for non-browser callers (scripts/backfillWordGender.ts).
        'User-Agent': USER_AGENT,
      },
    });
    if (!response.ok) return null;
    const data: { results?: { bindings: Record<string, { value: string }>[] } } = await response.json();
    return { bindings: data.results?.bindings ?? [] };
  } catch (error) {
    console.error('Error querying Wikidata:', error);
    return null;
  }
}

/**
 * Resolves an ISO 639-1 code (this app's `languageId`) to its Wikidata
 * language-item QID via P218, e.g. 'de' -> 'Q188'. Cached in memory per
 * page load -- this is stable, near-static reference data, not worth a
 * network round trip on every word saved. A failed/not-found lookup is
 * deliberately NOT cached, so a transient network error or a not-yet-tried
 * code gets retried next time rather than being written off forever.
 */
const languageQidCache = new Map<LanguageId, string>();

async function resolveLanguageQid(languageId: LanguageId): Promise<string | null> {
  const cached = languageQidCache.get(languageId);
  if (cached) return cached;

  const result = await sparqlSelect(
    `SELECT ?lang WHERE { ?lang wdt:${ISO_639_1_PROPERTY} "${escapeForSparqlString(languageId)}" . } LIMIT 1`
  );
  const uri = result?.bindings[0]?.lang?.value;
  const qid = uri?.split('/').pop();
  if (!qid) return null;

  languageQidCache.set(languageId, qid);
  return qid;
}

/**
 * German nouns are always capitalized grammatically (Wikidata's lemma data
 * reflects that), but plenty of words get typed casually in lowercase
 * ("brot"). Force-capitalizing only for German avoids a silent lookup miss
 * on nothing more than casing -- French common nouns are lowercase by
 * convention, so this would break a French match instead of fixing one.
 */
function normalizeCaseForLookup(word: string, languageId: LanguageId): string {
  if (languageId !== 'de' || word.length === 0) return word;
  return word[0].toUpperCase() + word.slice(1);
}

/**
 * Looks up the grammatical gender of `text` taken as-is (no article
 * stripping here -- callers decide what to try), or 'plural' if it matches
 * an inflected plural form instead of a lemma (plural nouns don't carry
 * their own gender -- see the "Schulden" case in the migration/design
 * notes). Returns null on no match, an unresolvable language, or any
 * failure.
 */
export async function lookupGender(text: string, languageId: LanguageId): Promise<Gender | null> {
  const languageQid = await resolveLanguageQid(languageId);
  const word = escapeForSparqlString(normalizeCaseForLookup(text.trim(), languageId));
  if (!languageQid || !word) return null;

  const result = await sparqlSelect(`SELECT ?genderLabel ?isPlural WHERE {
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
} LIMIT 5`);
  if (!result) return null;

  const genderLabel = result.bindings.find((b) => b.genderLabel)?.genderLabel?.value;
  if (genderLabel && GENDER_LABEL_MAP[genderLabel]) return GENDER_LABEL_MAP[genderLabel];

  if (result.bindings.some((b) => b.isPlural?.value === 'true')) return 'plural';

  return null;
}

/** Strips exactly one already-identified leading article/determiner, e.g. "die Verwaltung" -> "Verwaltung", French elided "l'arbre" -> "arbre". */
function stripFirstWord(text: string, languageId: LanguageId): string {
  if (languageId === 'fr' && /^l['’]/i.test(text)) {
    return text.slice(text.search(/['’]/) + 1).trim();
  }
  const spaceIndex = text.indexOf(' ');
  return spaceIndex === -1 ? text : text.slice(spaceIndex + 1).trim();
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
 * parse first (src/utils/parseGender.ts's small, hardcoded-but-only-an-
 * optimization article list), then a live lookup.
 *
 * The lookup itself never trusts that list to be complete. A *known*
 * article (parseGenderFromArticle returned 'ambiguous', e.g. German "die"/
 * "ein", French "l'") is stripped once and looked up directly. Anything
 * else -- no recognized article at all -- tries the text as typed first
 * (the common case: a bare noun with no article), and only if that comes
 * back empty does it strip one leading word and try again. That second
 * attempt is what makes an incomplete/forgotten article entry (like the
 * "ein"/"eine" gap that caused "ein Faultier" to silently never resolve)
 * degrade to "one extra request" instead of "wrong forever": Wikidata's
 * own data decides whether the remainder is a real noun, not a hardcoded
 * list of what counts as an article.
 */
export async function resolveGender(
  text: string,
  languageId: LanguageId,
  partOfSpeech: string | null = null
): Promise<Gender | null> {
  if (!isGenderEligible(partOfSpeech)) return null;

  const trimmed = text.trim();
  const fromArticle = parseGenderFromArticle(trimmed, languageId);
  if (fromArticle && fromArticle !== 'ambiguous') return fromArticle;

  if (fromArticle === 'ambiguous') {
    return lookupGender(stripFirstWord(trimmed, languageId), languageId);
  }

  const direct = await lookupGender(trimmed, languageId);
  if (direct) return direct;

  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) return null;
  return lookupGender(trimmed.slice(spaceIndex + 1).trim(), languageId);
}
