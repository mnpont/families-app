import type { Conjugations, Person } from '../types/conjugations';
import type { LanguageId } from '../types/models';

/**
 * Per-language configuration for the Conjugation Drill and the Conjugate
 * modal. Everything language-specific the UI needs lives here, so adding a
 * language is this file plus its generator (docs/practice-hub-spec.md
 * "German later") -- no component changes.
 */

/**
 * Languages whose words get conjugations. Mirrors CONJUGATION_LANGUAGES in
 * supabase/functions/_shared/conjugationCore.ts (the generator's copy);
 * keep the two in sync.
 */
export const CONJUGATION_LANGUAGES: LanguageId[] = ['fr'];

/** Questions per session (fewer when there aren't that many verb x tense x person combinations). */
export const DRILL_SESSION_SIZE = 20;

/** A wrong answer comes back this many positions later... */
export const RETRY_OFFSET_MIN = 3;
export const RETRY_OFFSET_MAX = 5;
/** ...at most this many times per question. */
export const MAX_RETRIES_PER_ITEM = 2;

export interface TenseConfig {
  /** Key into Conjugations.tenses. */
  key: string;
  /** As shown on the tense pill and chip ("Passé composé"). */
  label: string;
  /** Offered in the setup sheet and the Conjugate modal. Enabling a tense is flipping this. */
  offered: boolean;
  /** Among the offered tenses, whether its chip starts on in the setup sheet. */
  defaultOn: boolean;
}

export interface PersonConfig {
  key: Person;
  label: string;
}

/** A note line split around its bold key word: "aller uses **être** in the passé composé". */
export interface NoteParts {
  before: string;
  bold: string;
  after: string;
}

export interface ConjugationLanguageConfig {
  /** For the answer input's lang attribute. */
  inputLang: string;
  persons: PersonConfig[];
  /** The conjugation table's rows: singular | plural (ConjugationTable). */
  tableRows: [Person, Person][];
  tenses: TenseConfig[];
  /**
   * Subject pronouns a learner might type before the form out of habit;
   * grading strips one (src/utils/gradeConjugation.ts). Longest-first
   * matching is handled there.
   */
  subjectPronouns: string[];
  /** The pronoun to show before `form` -- French "j'" before a vowel/mute h. */
  pronounLabel: (person: PersonConfig, form: string, conjugations: Conjugations) => string;
  /** The infinitive as the learner saved it, reflexive included ("se lever"). */
  displayInfinitive: (conjugations: Conjugations) => string;
  /** The optional rule note under the table, or null. */
  note: (conjugations: Conjugations, tenseKey: string) => NoteParts | null;
}

const VOWEL_START = /^[aeiouàâäéèêëîïôöûùüœæ]/i;

/** Same rule as startsWithElidingSound in supabase/functions/_shared/conjugationCore.ts. */
function frenchElides(word: string, hAspire: boolean): boolean {
  return VOWEL_START.test(word) || (/^h/i.test(word) && !hAspire);
}

const FRENCH_COMPOUND_TENSES = new Set([
  'passe_compose',
  'plus_que_parfait',
  'passe_anterieur',
  'futur_anterieur',
  'conditionnel_passe',
  'conditionnel_passe_2',
  'subjonctif_passe',
  'subjonctif_plus_que_parfait',
]);

const FRENCH_TENSES: TenseConfig[] = [
  { key: 'present', label: 'Présent', offered: true, defaultOn: true },
  { key: 'passe_compose', label: 'Passé composé', offered: true, defaultOn: true },
  { key: 'imparfait', label: 'Imparfait', offered: true, defaultOn: false },
  { key: 'futur', label: 'Futur simple', offered: true, defaultOn: false },
  { key: 'conditionnel_present', label: 'Conditionnel', offered: true, defaultOn: false },
  { key: 'plus_que_parfait', label: 'Plus-que-parfait', offered: true, defaultOn: false },
  { key: 'subjonctif_present', label: 'Subjonctif', offered: false, defaultOn: false },
];

const french: ConjugationLanguageConfig = {
  inputLang: 'fr',
  persons: [
    { key: 'je', label: 'je' },
    { key: 'tu', label: 'tu' },
    { key: 'il', label: 'il' },
    { key: 'elle', label: 'elle' },
    { key: 'nous', label: 'nous' },
    { key: 'vous', label: 'vous' },
    { key: 'ils', label: 'ils' },
    { key: 'elles', label: 'elles' },
  ],
  tableRows: [
    ['je', 'nous'],
    ['tu', 'vous'],
    ['il', 'ils'],
    ['elle', 'elles'],
  ],
  tenses: FRENCH_TENSES,
  subjectPronouns: ["j'", 'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles'],
  pronounLabel: (person, form, conjugations) =>
    person.key === 'je' && frenchElides(form, conjugations.hAspire) ? "j'" : person.label,
  displayInfinitive: ({ infinitive, pronominal, hAspire }) => {
    if (!pronominal) return infinitive;
    return frenchElides(infinitive, hAspire) ? `s'${infinitive}` : `se ${infinitive}`;
  },
  note: (conjugations, tenseKey) => {
    if (!FRENCH_COMPOUND_TENSES.has(tenseKey) || conjugations.auxiliary !== 'etre') return null;
    const tense = FRENCH_TENSES.find((t) => t.key === tenseKey)?.label.toLowerCase() ?? tenseKey;
    const infinitive = french.displayInfinitive(conjugations);
    if (conjugations.pronominal) {
      return {
        before: `${infinitive} is pronominal, so it uses `,
        bold: 'être',
        after: ` in the ${tense}`,
      };
    }
    return { before: `${infinitive} uses `, bold: 'être', after: ` in the ${tense}` };
  },
};

export const CONJUGATION_CONFIG: Partial<Record<LanguageId, ConjugationLanguageConfig>> = {
  fr: french,
};

export function conjugationConfigFor(
  languageId: LanguageId | null,
): ConjugationLanguageConfig | null {
  if (!languageId || !CONJUGATION_LANGUAGES.includes(languageId)) return null;
  return CONJUGATION_CONFIG[languageId] ?? null;
}

export function offeredTenses(config: ConjugationLanguageConfig): TenseConfig[] {
  return config.tenses.filter((tense) => tense.offered);
}
