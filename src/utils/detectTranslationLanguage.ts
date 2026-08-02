import { preLoadedWords } from '../data/preLoadedWords';

/**
 * Every one of the 281 bundled seed entries (src/data/preLoadedWords.ts) has
 * Spanish in its `english` field despite the field name -- confirmed by
 * inspection (docs/audit.md Section 2), not a per-row guess. Matching
 * against the known (word, translation) pairs is exact and free, so it's
 * checked first. This can't match on the legacy row's numeric `id`: the
 * original insert code never set `id` explicitly (see the old
 * useVocabulary/App load logic), so Postgres assigned its own identity
 * sequence -- the live row ids have no relationship to the 1000+ ids in
 * this bundled array.
 */
const KNOWN_SEED_PAIRS = new Set(preLoadedWords.map((w) => `${w.german}|||${w.english}`));

/**
 * Fallback heuristic for anything NOT in the known seed set (i.e. words
 * added through the app after the initial seed, where we have no ground
 * truth). This only inspects the translation text itself, not the word's
 * target language, so it applies unchanged to any language in `languages`.
 * It's a keyword/diacritic guess, not a real language detector, and is
 * expected to be wrong on short, marker-free Spanish text -- there is no
 * network/ML language-detection call available in this environment.
 * Defaults to 'en' since the app's "Translation" field placeholder/UI copy
 * has always implied English going forward.
 */
const SPANISH_MARKERS =
  /[ñáéíóú¿¡]|(?:^|[\s.,;:!?()"'])(el|la|los|las|un|una|unos|unas|de|del|que|es|son|está|estar|estás|con|para|por|más|pero|también|muy|hasta|desde|cuando|donde|porque|como|sin|sobre|entre|hacia)(?=[\s.,;:!?()"']|$)/i;

export function detectTranslationLanguage(wordText: string, translationText: string): 'es' | 'en' {
  if (KNOWN_SEED_PAIRS.has(`${wordText}|||${translationText}`)) return 'es';
  return SPANISH_MARKERS.test(translationText) ? 'es' : 'en';
}
