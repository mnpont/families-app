import { describe, expect, it } from 'vitest';
import { CONJUGATION_CONFIG, conjugationConfigFor, offeredTenses } from './conjugation';
import type { Conjugations } from '../types/conjugations';

const fr = CONJUGATION_CONFIG.fr!;
const je = fr.persons[0];
const verb = (overrides: Partial<Conjugations>): Conjugations => ({
  version: 1,
  source: 'lefff',
  infinitive: 'aller',
  pronominal: false,
  hAspire: false,
  auxiliary: 'avoir',
  tenses: {},
  ...overrides,
});

describe('French drill config', () => {
  it('offers the six setup-sheet tenses, with présent and passé composé on by default', () => {
    expect(offeredTenses(fr).map((t) => t.key)).toEqual([
      'present',
      'passe_compose',
      'imparfait',
      'futur',
      'conditionnel_present',
      'plus_que_parfait',
    ]);
    expect(
      offeredTenses(fr)
        .filter((t) => t.defaultOn)
        .map((t) => t.key),
    ).toEqual(['present', 'passe_compose']);
  });

  it('has no config for German yet', () => {
    expect(conjugationConfigFor('de')).toBeNull();
  });

  it("shows j' before a vowel or mute h, never before an aspirated h", () => {
    expect(fr.pronounLabel(je, 'ai mangé', verb({}))).toBe("j'");
    expect(fr.pronounLabel(je, 'habite', verb({ infinitive: 'habiter' }))).toBe("j'");
    expect(fr.pronounLabel(je, 'hais', verb({ infinitive: 'haïr', hAspire: true }))).toBe('je');
    expect(fr.pronounLabel(je, 'suis allé', verb({}))).toBe('je');
    expect(fr.pronounLabel(je, "m'habille", verb({}))).toBe('je');
  });

  it('shows the reflexive in the infinitive', () => {
    expect(fr.displayInfinitive(verb({ infinitive: 'lever', pronominal: true }))).toBe('se lever');
    expect(fr.displayInfinitive(verb({ infinitive: 'habiller', pronominal: true }))).toBe(
      "s'habiller",
    );
  });

  it('adds the être note to compound tenses of être and pronominal verbs only', () => {
    const aller = verb({ auxiliary: 'etre' });
    expect(fr.note(aller, 'passe_compose')).toEqual({
      before: 'aller uses ',
      bold: 'être',
      after: ' in the passé composé',
    });
    expect(fr.note(aller, 'present')).toBeNull();
    expect(fr.note(verb({}), 'passe_compose')).toBeNull();
    expect(
      fr.note(verb({ infinitive: 'lever', pronominal: true, auxiliary: 'etre' }), 'passe_compose')
        ?.before,
    ).toBe('se lever is pronominal, so it uses ');
  });
});
