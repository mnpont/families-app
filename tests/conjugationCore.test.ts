import { describe, expect, it } from 'vitest';
import {
  buildFrenchConjugations,
  normalizeVerbInput,
  planConjugationUpdate,
  startsWithElidingSound,
  type WordForConjugation,
} from '../supabase/functions/_shared/conjugationCore';
import { loadFrenchConjugator } from '../scripts/frenchConjugator';

const conjugator = loadFrenchConjugator();

function conjugate(text: string) {
  const candidate = normalizeVerbInput(text);
  if (candidate.kind !== 'candidate') throw new Error(`${text}: ${candidate.reason}`);
  const result = buildFrenchConjugations(conjugator, candidate.infinitive, candidate.pronominal);
  if (!result) throw new Error(`${text}: not found`);
  return result;
}

describe('normalizeVerbInput', () => {
  it('trims, lowercases and collapses spaces', () => {
    expect(normalizeVerbInput('  Aller ')).toEqual({
      kind: 'candidate',
      infinitive: 'aller',
      pronominal: false,
    });
  });

  it('strips "se " and "s\'" (either apostrophe) and remembers it is pronominal', () => {
    expect(normalizeVerbInput('se  Lever')).toEqual({
      kind: 'candidate',
      infinitive: 'lever',
      pronominal: true,
    });
    expect(normalizeVerbInput('s’habiller')).toEqual({
      kind: 'candidate',
      infinitive: 'habiller',
      pronominal: true,
    });
    expect(normalizeVerbInput("s' asseoir")).toMatchObject({ infinitive: 'asseoir' });
  });

  it.each([
    'le dîner',
    'la gare',
    "l'avion",
    'l’été',
    'les courses',
    'un repas',
    'une idée',
    'des amis',
  ])('skips "%s" because of its article', (text) => {
    expect(normalizeVerbInput(text)).toEqual({ kind: 'skip', reason: 'article' });
  });

  it('skips things that cannot be an infinitive', () => {
    expect(normalizeVerbInput('')).toEqual({ kind: 'skip', reason: 'empty' });
    expect(normalizeVerbInput('voilà')).toMatchObject({ reason: 'not-an-infinitive' });
    expect(normalizeVerbInput('faire la cuisine')).toMatchObject({ reason: 'not-an-infinitive' });
  });

  it('does not mistake a word starting with "le"/"se" for an article', () => {
    expect(normalizeVerbInput('lever')).toMatchObject({ kind: 'candidate', infinitive: 'lever' });
    expect(normalizeVerbInput('sentir')).toMatchObject({ kind: 'candidate', infinitive: 'sentir' });
  });
});

describe('planConjugationUpdate', () => {
  const word = (overrides: Partial<WordForConjugation>): WordForConjugation => ({
    id: 1,
    language_id: 'fr',
    text: 'aller',
    part_of_speech: null,
    conjugations: null,
    ...overrides,
  });

  it('stores and tags an untyped verb', () => {
    expect(planConjugationUpdate(word({}), conjugator)).toMatchObject({
      action: 'store',
      tagAsVerb: true,
    });
  });

  it('stores without re-tagging a word already typed as a verb', () => {
    expect(planConjugationUpdate(word({ part_of_speech: 'verb' }), conjugator)).toMatchObject({
      action: 'store',
      tagAsVerb: false,
    });
  });

  it('leaves words typed as something else alone', () => {
    expect(planConjugationUpdate(word({ part_of_speech: 'noun' }), conjugator).action).toBe('none');
  });

  it('is a no-op outside CONJUGATION_LANGUAGES', () => {
    expect(planConjugationUpdate(word({ language_id: 'de', text: 'gehen' }), conjugator)).toEqual({
      action: 'none',
      reason: 'language',
    });
  });

  it('flags a verb-typed word the dictionary does not know', () => {
    expect(
      planConjugationUpdate(word({ text: 'blorpifier', part_of_speech: 'verb' }), conjugator),
    ).toMatchObject({ action: 'none', taggedVerbNotFound: true });
  });

  it('clears stale conjugations when the text was edited away from a verb', () => {
    expect(
      planConjugationUpdate(word({ text: 'la gare', conjugations: { version: 1 } }), conjugator),
    ).toMatchObject({ action: 'clear' });
  });
});

describe('buildFrenchConjugations (Step 1 spot checks)', () => {
  it('uses être, with agreement variants, for aller', () => {
    const aller = conjugate('aller');
    expect(aller.auxiliary).toBe('etre');
    expect(aller.tenses.passe_compose).toMatchObject({
      je: ['suis allé', 'suis allée'],
      elle: 'est allée',
      nous: ['sommes allés', 'sommes allées'],
      vous: ['êtes allé', 'êtes allée', 'êtes allés', 'êtes allées'],
      ils: 'sont allés',
      elles: 'sont allées',
    });
  });

  it('uses avoir for être and avoir themselves', () => {
    expect(conjugate('être').tenses.passe_compose?.je).toBe('ai été');
    expect(conjugate('avoir').tenses.passe_compose?.je).toBe('ai eu');
  });

  it('includes the reflexive pronoun in pronominal forms', () => {
    const lever = conjugate('se lever');
    expect(lever.pronominal).toBe(true);
    expect(lever.infinitive).toBe('lever');
    expect(lever.tenses.present?.je).toBe('me lève');
    expect(lever.tenses.present?.nous).toBe('nous levons');
    expect(lever.tenses.passe_compose?.je).toEqual(['me suis levé', 'me suis levée']);
    expect(lever.tenses.passe_compose?.tu).toEqual(["t'es levé", "t'es levée"]);
    expect(lever.tenses.imperatif_present?.tu).toBe('lève-toi');
  });

  it('elides the reflexive before the verb, not the auxiliary, for a mute h', () => {
    const habiller = conjugate("s'habiller");
    expect(habiller.tenses.present?.je).toBe("m'habille");
    expect(habiller.tenses.passe_compose?.je).toEqual(['me suis habillé', 'me suis habillée']);
    expect(habiller.tenses.passe_compose?.ils).toBe('se sont habillés');
  });

  it('keeps the participle invariable when the reflexive is an indirect object', () => {
    expect(conjugate('se parler').tenses.passe_compose?.elles).toBe('se sont parlé');
  });

  it.each([
    ['être', 'suis', 'sommes', 'sont', 'ai été'],
    ['avoir', 'ai', 'avons', 'ont', 'ai eu'],
    ['aller', 'vais', 'allons', 'vont', ['suis allé', 'suis allée']],
    ['faire', 'fais', 'faisons', 'font', 'ai fait'],
    ['pouvoir', ['peux', 'puis'], 'pouvons', 'peuvent', 'ai pu'],
    ['vouloir', 'veux', 'voulons', 'veulent', 'ai voulu'],
    ['devoir', 'dois', 'devons', 'doivent', 'ai dû'],
    ['savoir', 'sais', 'savons', 'savent', 'ai su'],
    ['venir', 'viens', 'venons', 'viennent', ['suis venu', 'suis venue']],
    ['prendre', 'prends', 'prenons', 'prennent', 'ai pris'],
    ['dire', 'dis', 'disons', 'disent', 'ai dit'],
    ['voir', 'vois', 'voyons', 'voient', 'ai vu'],
    ['mettre', 'mets', 'mettons', 'mettent', 'ai mis'],
    ['tenir', 'tiens', 'tenons', 'tiennent', 'ai tenu'],
    ['manger', 'mange', 'mangeons', 'mangent', 'ai mangé'],
    ['commencer', 'commence', 'commençons', 'commencent', 'ai commencé'],
    ['appeler', 'appelle', 'appelons', 'appellent', 'ai appelé'],
    ['acheter', 'achète', 'achetons', 'achètent', 'ai acheté'],
  ])('%s', (verb, je, nous, ils, pcJe) => {
    const result = conjugate(verb);
    expect(result.tenses.present?.je).toEqual(je);
    expect(result.tenses.present?.nous).toBe(nous);
    expect(result.tenses.present?.ils).toBe(ils);
    expect(result.tenses.passe_compose?.je).toEqual(pcJe);
  });

  it('adds the avoir form as an accepted variant for monter-type verbs', () => {
    expect(conjugate('monter').tenses.passe_compose?.il).toEqual(['est monté', 'a monté']);
  });

  it('accepts both spellings of -ayer verbs', () => {
    expect(conjugate('payer').tenses.present?.je).toEqual(['paie', 'paye']);
  });

  it('leaves out persons an impersonal verb does not have', () => {
    const falloir = conjugate('falloir');
    expect(Object.keys(falloir.tenses.present ?? {})).toEqual(['il', 'elle']);
    expect(Object.keys(falloir.tenses.passe_compose ?? {})).toEqual(['il', 'elle']);
  });

  it('flags an aspirated h', () => {
    expect(conjugate('haïr').hAspire).toBe(true);
    expect(conjugate('habiter').hAspire).toBe(false);
  });
});

describe('startsWithElidingSound', () => {
  it('elides before vowels and mute h only', () => {
    expect(startsWithElidingSound('ai mangé', false)).toBe(true);
    expect(startsWithElidingSound('habite', false)).toBe(true);
    expect(startsWithElidingSound('hais', true)).toBe(false);
    expect(startsWithElidingSound('suis allé', false)).toBe(false);
    expect(startsWithElidingSound('me lève', false)).toBe(false);
  });
});
