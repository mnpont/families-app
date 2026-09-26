import { describe, expect, it } from 'vitest';
import {
  diffSegments,
  foldDiacritics,
  gradeConjugation,
  markMissedAccents,
  normalizeAnswer,
} from './gradeConjugation';

const PRONOUNS = ["j'", 'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles'];
const grade = (input: string, variants: string[]) => gradeConjugation(input, variants, PRONOUNS);

describe('normalizeAnswer', () => {
  it('trims, lowercases, collapses spaces and strips trailing punctuation', () => {
    expect(normalizeAnswer('  Sommes   ALLÉS. ')).toBe('sommes allés');
    expect(normalizeAnswer('vais!?')).toBe('vais');
  });

  it('unifies apostrophes and removes spaces around them', () => {
    expect(normalizeAnswer('m’ habille')).toBe("m'habille");
    expect(normalizeAnswer("t 'es levé")).toBe("t'es levé");
  });
});

describe('foldDiacritics', () => {
  it('drops accents and spells out ligatures', () => {
    expect(foldDiacritics('êtes')).toBe('etes');
    expect(foldDiacritics('commençons')).toBe('commencons');
    expect(foldDiacritics('œuvre')).toBe('oeuvre');
  });
});

describe('gradeConjugation', () => {
  it('accepts an exact match with any variant', () => {
    expect(grade('suis allée', ['suis allé', 'suis allée'])).toMatchObject({
      grade: 'correct',
      expected: 'suis allée',
    });
  });

  it('is case-, space- and punctuation-insensitive', () => {
    expect(grade('  Allons. ', ['allons']).grade).toBe('correct');
  });

  it('strips a subject pronoun typed out of habit', () => {
    expect(grade('nous allons', ['allons']).grade).toBe('correct');
    expect(grade("j'ai mangé", ['ai mangé']).grade).toBe('correct');
    expect(grade('j’ai mangé', ['ai mangé']).grade).toBe('correct');
    expect(grade('je suis allé', ['suis allé']).grade).toBe('correct');
  });

  it('keeps the unstripped input as a candidate for nous/vous pronominal forms', () => {
    expect(grade('nous levons', ['nous levons']).grade).toBe('correct');
    expect(grade('nous nous levons', ['nous levons']).grade).toBe('correct');
    expect(grade('vous vous êtes levés', ['vous êtes levé', 'vous êtes levés']).grade).toBe(
      'correct',
    );
  });

  it('grades an accent-only mistake as almost, marking the missed letters', () => {
    const result = grade('etes', ['êtes']);
    expect(result.grade).toBe('almost');
    expect(result.segments).toEqual([
      { text: 'ê', mark: true },
      { text: 'tes', mark: false },
    ]);
  });

  it('counts a wrong accent as almost too', () => {
    expect(grade('lêve', ['lève']).grade).toBe('almost');
  });

  it('counts a missing cedilla as almost', () => {
    const result = grade('commencons', ['commençons']);
    expect(result.grade).toBe('almost');
    expect(result.segments.filter((s) => s.mark).map((s) => s.text)).toEqual(['ç']);
  });

  it('grades anything else as wrong, showing the closest variant', () => {
    const result = grade('avons allé', ['sommes allés', 'sommes allées']);
    expect(result.grade).toBe('wrong');
    expect(result.expected).toBe('sommes allés');
    expect(result.segments).toEqual([
      { text: 'sommes', mark: true },
      { text: ' allé', mark: false },
      { text: 's', mark: true },
    ]);
  });

  it('picks the variant nearest the input for the wrong feedback', () => {
    expect(grade('sommes allees', ['sommes allés', 'sommes allées']).grade).toBe('almost');
    expect(grade('sommes alléees', ['sommes allés', 'sommes allées']).expected).toBe(
      'sommes allées',
    );
  });
});

describe('markMissedAccents', () => {
  it('handles œ typed as oe', () => {
    expect(markMissedAccents('sœur', 'soeur')).toEqual([
      { text: 's', mark: false },
      { text: 'œ', mark: true },
      { text: 'ur', mark: false },
    ]);
  });
});

describe('diffSegments', () => {
  it('highlights a missing word when word counts differ', () => {
    expect(diffSegments('me suis levé', 'suis levé')).toEqual([
      { text: 'me', mark: true },
      { text: ' suis levé', mark: false },
    ]);
  });

  it('diffs a misspelled word by letter even when a word is missing', () => {
    expect(diffSegments('vous êtes levé', 'xyz lev')).toEqual([
      { text: 'vous', mark: true },
      { text: ' ', mark: false },
      { text: 'êtes', mark: true },
      { text: ' lev', mark: false },
      { text: 'é', mark: true },
    ]);
  });

  it('highlights a replaced word whole', () => {
    expect(diffSegments('vont', 'allent')).toEqual([{ text: 'vont', mark: true }]);
  });
});
