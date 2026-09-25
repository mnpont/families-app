/**
 * Pure conjugation logic shared by every consumer of words.conjugations
 * (migrations/016_add_words_conjugations.sql):
 *
 *   - supabase/functions/_shared/generateConjugations.ts (Deno, npm: imports)
 *   - scripts/backfillConjugations.ts (Node, via tsx)
 *   - tests/conjugationCore.test.ts (Vitest)
 *
 * It deliberately imports NOTHING -- not even the conjugation library. The
 * library (french-verbs + the Lefff dictionary, french-contractions) is
 * injected through createFrenchConjugator by each caller, because Deno
 * resolves it through `npm:` specifiers and Node through node_modules, and
 * neither can read the other's import syntax. Keeping this file import-free
 * is what lets one copy of the rules serve all three.
 *
 * Why there is a layer here at all, instead of calling the library's
 * getConjugation for every cell: the Step 1 spike (docs/practice-hub-spec.md
 * "Spike results") found the library is right about the forms themselves but
 * leaves several things to the caller or gets them subtly wrong for a
 * learner's drill:
 *
 *   - The auxiliary. Its built-in être list misses monter/descendre/sortir/
 *     rentrer/retourner/passer, and it throws for any verb that's neither on
 *     that list nor in its transitive-verbs list (including être itself).
 *   - Agreement. It produces ONE form per call (default masculine singular);
 *     a drill has to accept "je suis allé" and "je suis allée" alike.
 *   - Reflexive elision. It elides the reflexive before the AUXILIARY when the
 *     verb starts with a mute h ("je m'suis habillé", "ils s'sont habillés").
 *   - A few Lefff data quirks: literary "je puis" as the only form of
 *     pouvoir, only the -aye- spelling of payer/essayer, only the -oi- forms
 *     of asseoir, and an archaic participle for résoudre ("résous").
 */

// ---------------------------------------------------------------------------
// Stored shape (words.conjugations). Mirrored for the app in
// src/types/conjugations.ts -- keep the two in sync.
// ---------------------------------------------------------------------------

export const CONJUGATIONS_VERSION = 1;

/** Languages whose words get conjugations. Mirrored in src/constants/conjugation.ts. */
export const CONJUGATION_LANGUAGES = ["fr"];

export type FrenchPerson = "je" | "tu" | "il" | "elle" | "nous" | "vous" | "ils" | "elles";

/** One accepted form, or several accepted variants -- the first is canonical. */
export type PersonForms = string | string[];

export type TenseForms = Partial<Record<FrenchPerson, PersonForms>>;

export interface StoredConjugations {
  version: number;
  source: "lefff" | "llm";
  /** Without any reflexive pronoun: "lever" for "se lever". */
  infinitive: string;
  pronominal: boolean;
  /**
   * True for a verb starting with an aspirated h (haïr, hurler), which blocks
   * elision: "je hais", not "j'hais". Readers decide "je" vs "j'" from the
   * answer's first letter plus this flag -- see startsWithElidingSound.
   */
  hAspire: boolean;
  auxiliary: "etre" | "avoir";
  /** Keyed by StoredTense. A person is absent when the verb has no form for it (impersonal "il faut"). */
  tenses: Partial<Record<StoredTense, TenseForms>>;
}

/**
 * Every personal tense the library supports. Imperatif passé and the
 * non-finite forms (infinitif, participes) aren't stored: they take no
 * subject, so they can never be a "type what follows the pronoun" prompt.
 */
export const STORED_TENSES = [
  "present",
  "imparfait",
  "passe_simple",
  "futur",
  "passe_compose",
  "plus_que_parfait",
  "passe_anterieur",
  "futur_anterieur",
  "conditionnel_present",
  "conditionnel_passe",
  "conditionnel_passe_2",
  "subjonctif_present",
  "subjonctif_imparfait",
  "subjonctif_passe",
  "subjonctif_plus_que_parfait",
  "imperatif_present",
] as const;
export type StoredTense = (typeof STORED_TENSES)[number];

/** The library's own tense names (french-verbs validTenses). */
export type LibraryTense =
  | "PRESENT"
  | "IMPARFAIT"
  | "PASSE_SIMPLE"
  | "FUTUR"
  | "PASSE_COMPOSE"
  | "PLUS_QUE_PARFAIT"
  | "PASSE_ANTERIEUR"
  | "FUTUR_ANTERIEUR"
  | "CONDITIONNEL_PRESENT"
  | "CONDITIONNEL_PASSE_1"
  | "CONDITIONNEL_PASSE_2"
  | "SUBJONCTIF_PRESENT"
  | "SUBJONCTIF_IMPARFAIT"
  | "SUBJONCTIF_PASSE"
  | "SUBJONCTIF_PLUS_QUE_PARFAIT"
  | "IMPERATIF_PRESENT";

const LIBRARY_TENSE: Record<StoredTense, LibraryTense> = {
  present: "PRESENT",
  imparfait: "IMPARFAIT",
  passe_simple: "PASSE_SIMPLE",
  futur: "FUTUR",
  passe_compose: "PASSE_COMPOSE",
  plus_que_parfait: "PLUS_QUE_PARFAIT",
  passe_anterieur: "PASSE_ANTERIEUR",
  futur_anterieur: "FUTUR_ANTERIEUR",
  conditionnel_present: "CONDITIONNEL_PRESENT",
  conditionnel_passe: "CONDITIONNEL_PASSE_1",
  conditionnel_passe_2: "CONDITIONNEL_PASSE_2",
  subjonctif_present: "SUBJONCTIF_PRESENT",
  subjonctif_imparfait: "SUBJONCTIF_IMPARFAIT",
  subjonctif_passe: "SUBJONCTIF_PASSE",
  subjonctif_plus_que_parfait: "SUBJONCTIF_PLUS_QUE_PARFAIT",
  imperatif_present: "IMPERATIF_PRESENT",
};

const COMPOUND_TENSES = new Set<StoredTense>([
  "passe_compose",
  "plus_que_parfait",
  "passe_anterieur",
  "futur_anterieur",
  "conditionnel_passe",
  "conditionnel_passe_2",
  "subjonctif_passe",
  "subjonctif_plus_que_parfait",
]);

type Gender = "M" | "F";
type NumberSP = "S" | "P";

/**
 * Person -> library person index (0 je ... 5 ils) and the participle
 * agreements a learner may legitimately mean with être. The order of
 * `agreements` is the order of the stored variants, so the first is
 * canonical: je/tu default to masculine, vous to the singular "vous" of
 * politeness (docs/practice-hub-spec.md "Conjugations shape").
 */
const PERSONS: { person: FrenchPerson; index: number; agreements: [Gender, NumberSP][] }[] = [
  { person: "je", index: 0, agreements: [["M", "S"], ["F", "S"]] },
  { person: "tu", index: 1, agreements: [["M", "S"], ["F", "S"]] },
  { person: "il", index: 2, agreements: [["M", "S"]] },
  { person: "elle", index: 2, agreements: [["F", "S"]] },
  { person: "nous", index: 3, agreements: [["M", "P"], ["F", "P"]] },
  { person: "vous", index: 4, agreements: [["M", "S"], ["F", "S"], ["M", "P"], ["F", "P"]] },
  { person: "ils", index: 5, agreements: [["M", "P"]] },
  { person: "elles", index: 5, agreements: [["F", "P"]] },
];

/** The imperative has no subject and only three persons. */
const IMPERATIVE_PERSONS: { person: FrenchPerson; index: number; reflexive: string }[] = [
  { person: "tu", index: 1, reflexive: "toi" },
  { person: "nous", index: 3, reflexive: "nous" },
  { person: "vous", index: 4, reflexive: "vous" },
];

const REFLEXIVE = ["me", "te", "se", "nous", "vous", "se"];

/**
 * Verbs that take être in compound tenses when used without a direct
 * object. A superset of the library's own list (which misses the DR MRS
 * VANDERTRAMP verbs that ALSO take avoir with an object: see
 * DUAL_AUXILIARY_VERBS).
 */
const ETRE_VERBS = new Set([
  "aller", "apparaître", "arriver", "décéder", "devenir", "échoir", "entrer", "intervenir",
  "mourir", "naître", "naitre", "partir", "parvenir", "provenir", "redevenir", "repartir",
  "rester", "retomber", "revenir", "survenir", "tomber", "venir", "advenir",
  "monter", "remonter", "descendre", "redescendre", "sortir", "ressortir", "rentrer",
  "retourner", "passer", "repasser",
]);

/**
 * être verbs that take avoir when they have a direct object ("j'ai monté
 * les valises"). Drilled with être (the intransitive meaning a learner is
 * asked about), but the avoir form is accepted too rather than graded wrong.
 */
const DUAL_AUXILIARY_VERBS = new Set([
  "monter", "remonter", "descendre", "redescendre", "sortir", "ressortir", "rentrer",
  "retourner", "passer", "repasser",
]);

/**
 * Pronominal verbs whose reflexive is an INDIRECT object ("se parler" =
 * parler à soi/l'un à l'autre), so the participle never agrees: "elles se
 * sont parlé". Every other pronominal verb agrees like an être verb.
 */
const INVARIABLE_PRONOMINAL_VERBS = new Set([
  "parler", "téléphoner", "dire", "demander", "écrire", "sourire", "plaire", "déplaire",
  "complaire", "mentir", "nuire", "ressembler", "succéder", "suffire", "répondre",
]);

/**
 * Corrections to the Lefff data itself, applied once to the loaded
 * dictionary by applyLefffPatches. Each sets the CANONICAL form; the
 * original Lefff form, when still correct, is kept as an accepted variant
 * through ALTERNATE_FORMS below.
 */
const LEFFF_PATCHES: Record<string, Record<string, (string | null)[]>> = {
  // "je puis" is literary; every reference conjugates "je peux".
  pouvoir: { P: ["peux", "peux", "peut", "pouvons", "pouvez", "peuvent"] },
  // Lefff's "résous" is the archaic participle; the modern one is "résolu".
  résoudre: { K: ["résolu", "résolus", "résolue", "résolues"] },
  // Lefff only has the -oi- forms; references list -ie-/-ey- first.
  asseoir: {
    P: ["assieds", "assieds", "assied", "asseyons", "asseyez", "asseyent"],
    I: ["asseyais", "asseyais", "asseyait", "asseyions", "asseyiez", "asseyaient"],
    F: ["assiérai", "assiéras", "assiéra", "assiérons", "assiérez", "assiéront"],
    C: ["assiérais", "assiérais", "assiérait", "assiérions", "assiériez", "assiéraient"],
    S: ["asseye", "asseyes", "asseye", "asseyions", "asseyiez", "asseyent"],
    Y: ["NA", "assieds", "NA", "asseyons", "asseyez", "NA"],
  },
};

/** Still-correct forms the patches above replaced as canonical: accepted, never shown first. Indexed by library person index. */
const ALTERNATE_FORMS: Record<string, Partial<Record<LibraryTense, string[]>>> = {
  pouvoir: { PRESENT: ["puis"] },
  asseoir: {
    PRESENT: ["assois", "assois", "assoit", "assoyons", "assoyez", "assoient"],
    IMPARFAIT: ["assoyais", "assoyais", "assoyait", "assoyions", "assoyiez", "assoyaient"],
    FUTUR: ["assoirai", "assoiras", "assoira", "assoirons", "assoirez", "assoiront"],
    CONDITIONNEL_PRESENT: ["assoirais", "assoirais", "assoirait", "assoirions", "assoiriez", "assoiraient"],
    SUBJONCTIF_PRESENT: ["assoie", "assoies", "assoie", "assoyions", "assoyiez", "assoient"],
  },
};

/** Minimal view of the Lefff dictionary: infinitive -> tense letter -> 6 person forms. */
export type LefffData = Record<string, Record<string, (string | null)[]>>;

/** Applies LEFFF_PATCHES in place. Call once per loaded dictionary. */
export function applyLefffPatches(lefff: LefffData): void {
  for (const [verb, patch] of Object.entries(LEFFF_PATCHES)) {
    if (!lefff[verb]) continue;
    Object.assign(lefff[verb], patch);
  }
}

// ---------------------------------------------------------------------------
// Library injection
// ---------------------------------------------------------------------------

/** The subset of french-verbs' getConjugation this file needs, as each runtime imports it. */
export type GetConjugationFn = (
  verbsList: LefffData,
  verb: string,
  tense: LibraryTense,
  person: number,
  options: { aux?: "AVOIR" | "ETRE"; agreeGender?: Gender; agreeNumber?: NumberSP },
  pronominal: boolean,
  negativeAdverb: undefined,
  modifierAdverb: undefined,
  voice: "Act"
) => string;

export interface FrenchConjugator {
  hasVerb(infinitive: string): boolean;
  /** One conjugated form (no subject, no reflexive), or null when the verb has none for this person. */
  conjugate(
    infinitive: string,
    tense: LibraryTense,
    personIndex: number,
    options?: { aux: "AVOIR" | "ETRE"; gender: Gender; number: NumberSP }
  ): string | null;
  isHMuet(word: string): boolean;
}

export function createFrenchConjugator(deps: {
  lefff: LefffData;
  getConjugation: GetConjugationFn;
  isHMuet: (word: string) => boolean;
}): FrenchConjugator {
  const { lefff, getConjugation, isHMuet } = deps;
  return {
    // être/avoir are conjugated from the library's own built-in tables.
    hasVerb: (infinitive) =>
      infinitive === "être" || infinitive === "avoir" || Object.hasOwn(lefff, infinitive),
    conjugate(infinitive, tense, personIndex, options) {
      try {
        const form = getConjugation(
          lefff,
          infinitive,
          tense,
          personIndex,
          options
            ? { aux: options.aux, agreeGender: options.gender, agreeNumber: options.number }
            : {},
          false,
          undefined,
          undefined,
          "Act"
        );
        return form && form !== "NA" ? form : null;
      } catch {
        // The library throws for a person a verb doesn't have (impersonal
        // "falloir" only has "il") -- that person is simply left out.
        return null;
      }
    },
    isHMuet,
  };
}

// ---------------------------------------------------------------------------
// Elision
// ---------------------------------------------------------------------------

const VOWEL_START = /^[aeiouàâäéèêëîïôöûùüœæ]/i;

/**
 * Whether a word elides the pronoun before it (je -> j', me -> m', se -> s'):
 * it starts with a vowel, or with a mute h. Same rule the app uses to show
 * "j'" in the drill prompt (src/utils/conjugationForms.ts), which reads
 * hAspire from the stored conjugations instead of the h lists.
 */
export function startsWithElidingSound(word: string, hAspire: boolean): boolean {
  if (VOWEL_START.test(word)) return true;
  return /^h/i.test(word) && !hAspire;
}

function withReflexive(form: string, personIndex: number, hAspire: boolean): string {
  const reflexive = REFLEXIVE[personIndex];
  // nous/vous never elide.
  if ((reflexive === "me" || reflexive === "te" || reflexive === "se") && startsWithElidingSound(form, hAspire)) {
    return `${reflexive[0]}'${form}`;
  }
  return `${reflexive} ${form}`;
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

export type VerbCandidate =
  | { kind: "candidate"; infinitive: string; pronominal: boolean }
  | { kind: "skip"; reason: "empty" | "article" | "not-an-infinitive" };

const LEADING_ARTICLE = /^(?:(?:le|la|les|un|une|des)\s|l')/;

/** French infinitives end in -er/-ir/-re (-ïr: haïr). Filters out the handful of non-verb Lefff keys ("voilà", "voici", "fiche"). */
const INFINITIVE_ENDING = /(?:er|ir|ïr|re)$/;

/**
 * Normalizes a word's text into the infinitive to look up (Step 3 detection
 * rules): trim, lowercase, unify apostrophes, collapse spaces; a leading
 * article means it's a noun ("le dîner"), a leading "se "/"s'" means a
 * pronominal verb and is stripped.
 */
export function normalizeVerbInput(text: string): VerbCandidate {
  const normalized = text
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/'\s+/g, "'");
  if (!normalized) return { kind: "skip", reason: "empty" };
  if (LEADING_ARTICLE.test(normalized)) return { kind: "skip", reason: "article" };

  let infinitive = normalized;
  let pronominal = false;
  if (infinitive.startsWith("se ")) {
    infinitive = infinitive.slice(3).trim();
    pronominal = true;
  } else if (infinitive.startsWith("s'")) {
    infinitive = infinitive.slice(2).trim();
    pronominal = true;
  }

  if (!infinitive || infinitive.includes(" ") || !INFINITIVE_ENDING.test(infinitive)) {
    return { kind: "skip", reason: "not-an-infinitive" };
  }
  return { kind: "candidate", infinitive, pronominal };
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

function dedupe(forms: string[]): PersonForms {
  const unique = [...new Set(forms)];
  return unique.length === 1 ? unique[0] : unique;
}

/** payer -> "paie" alongside Lefff's "paye": both spellings are standard. The ai-spelling goes first, as in most references. */
function ayerVariants(infinitive: string, form: string): string[] {
  if (!infinitive.endsWith("ayer")) return [form];
  const match = /^(.*)ay(e|es|ent|erai|eras|era|erons|erez|eront|erais|erait|erions|eriez|eraient)$/.exec(form);
  if (!match) return [form];
  return [`${match[1]}ai${match[2]}`, form];
}

/** Builds the full words.conjugations value for one verb, or null if the dictionary doesn't know it. */
export function buildFrenchConjugations(
  conjugator: FrenchConjugator,
  infinitive: string,
  pronominal: boolean
): StoredConjugations | null {
  if (!conjugator.hasVerb(infinitive)) return null;

  const hAspire = /^h/.test(infinitive) && !conjugator.isHMuet(infinitive);
  const auxiliary: "etre" | "avoir" = pronominal || ETRE_VERBS.has(infinitive) ? "etre" : "avoir";
  const aux = auxiliary === "etre" ? "ETRE" : "AVOIR";
  const invariable = pronominal && INVARIABLE_PRONOMINAL_VERBS.has(infinitive);

  const tenses: StoredConjugations["tenses"] = {};

  // The library happily composes "ai fallu" for every person of an
  // impersonal verb; only the persons its present tense has are real.
  const realPersons = new Set(
    [0, 1, 2, 3, 4, 5].filter((index) => conjugator.conjugate(infinitive, "PRESENT", index) !== null)
  );

  for (const tense of STORED_TENSES) {
    const libraryTense = LIBRARY_TENSE[tense];
    const forms: TenseForms = {};

    if (tense === "imperatif_present") {
      for (const { person, index, reflexive } of IMPERATIVE_PERSONS) {
        if (!realPersons.has(index)) continue;
        const form = conjugator.conjugate(infinitive, libraryTense, index);
        if (!form) continue;
        // Affirmative imperative puts the reflexive after: "lève-toi".
        const variants = ayerVariants(infinitive, form);
        forms[person] = dedupe(pronominal ? variants.map((f) => `${f}-${reflexive}`) : variants);
      }
    } else {
      for (const { person, index, agreements } of PERSONS) {
        if (!realPersons.has(index)) continue;
        let variants: string[];
        if (COMPOUND_TENSES.has(tense)) {
          const agreed: [Gender, NumberSP][] =
            auxiliary === "avoir" || invariable ? [["M", "S"]] : agreements;
          variants = agreed
            .map(([gender, number]) => conjugator.conjugate(infinitive, libraryTense, index, { aux, gender, number }))
            .filter((f): f is string => f !== null);
          if (!pronominal && DUAL_AUXILIARY_VERBS.has(infinitive)) {
            const withAvoir = conjugator.conjugate(infinitive, libraryTense, index, { aux: "AVOIR", gender: "M", number: "S" });
            if (withAvoir) variants.push(withAvoir);
          }
        } else {
          const form = conjugator.conjugate(infinitive, libraryTense, index);
          variants = form ? ayerVariants(infinitive, form) : [];
          const alternate = ALTERNATE_FORMS[infinitive]?.[libraryTense]?.[index];
          if (alternate && variants.length > 0) variants.push(alternate);
        }
        if (variants.length === 0) continue;
        if (pronominal) variants = variants.map((f) => withReflexive(f, index, hAspire));
        forms[person] = dedupe(variants);
      }
    }

    if (Object.keys(forms).length > 0) tenses[tense] = forms;
  }

  if (!tenses.present) return null;

  return {
    version: CONJUGATIONS_VERSION,
    source: "lefff",
    infinitive,
    pronominal,
    hAspire,
    auxiliary,
    tenses,
  };
}

// ---------------------------------------------------------------------------
// What to write for one word
// ---------------------------------------------------------------------------

export interface WordForConjugation {
  id: number;
  language_id: string;
  text: string;
  part_of_speech: string | null;
  conjugations: unknown | null;
}

export type ConjugationPlan =
  | { action: "store"; conjugations: StoredConjugations; tagAsVerb: boolean }
  | { action: "clear"; reason: string }
  | { action: "none"; reason: string; taggedVerbNotFound?: boolean };

/**
 * Decides what generate-conjugations / the backfill should write for one
 * word (Step 3 detection rules, docs/practice-hub-spec.md "Verb detection"):
 *
 *   1. Not a CONJUGATION_LANGUAGES word, or typed as anything but a verb ->
 *      leave it alone. A word re-typed away from 'verb' keeps whatever it
 *      has stored; the app filters it out (src/utils/conjugationForms.ts
 *      isConjugatable), so flipping the type back needs no regeneration.
 *   2. Article / not an infinitive / not in the dictionary -> nothing to
 *      store. If it DOES have conjugations stored, its text was edited
 *      away from a verb, so those are stale and get cleared.
 *   3. Found -> store, and tag it 'verb' if it had no type yet.
 */
export function planConjugationUpdate(word: WordForConjugation, conjugator: FrenchConjugator): ConjugationPlan {
  if (!CONJUGATION_LANGUAGES.includes(word.language_id)) return { action: "none", reason: "language" };
  if (word.part_of_speech && word.part_of_speech !== "verb") {
    return { action: "none", reason: `typed as ${word.part_of_speech}` };
  }

  const candidate = normalizeVerbInput(word.text);
  const conjugations =
    candidate.kind === "candidate"
      ? buildFrenchConjugations(conjugator, candidate.infinitive, candidate.pronominal)
      : null;

  if (!conjugations) {
    const reason = candidate.kind === "skip" ? candidate.reason : "not in dictionary";
    if (word.conjugations) return { action: "clear", reason };
    return { action: "none", reason, taggedVerbNotFound: word.part_of_speech === "verb" };
  }

  return { action: "store", conjugations, tagAsVerb: word.part_of_speech == null };
}
