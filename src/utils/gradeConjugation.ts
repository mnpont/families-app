/**
 * Auto-grading for typed conjugation answers (docs/practice-hub-spec.md
 * "Grading rules"). Pure: no config lookups, the caller passes the
 * accepted variants and the language's subject pronouns.
 *
 *   correct -- matches an accepted variant after normalizing
 *   almost  -- matches only once diacritics are removed (accents only)
 *   wrong   -- anything else
 *
 * Alongside the grade it returns what the feedback card renders: the
 * variant to show, split into segments with the letters to highlight --
 * the accented letters missed (almost) or the characters/words that
 * differ from the input (wrong).
 */

export type ConjugationGrade = 'correct' | 'almost' | 'wrong';

export interface Segment {
  text: string;
  mark: boolean;
}

export interface GradeResult {
  grade: ConjugationGrade;
  /** The accepted variant closest to what was typed. */
  expected: string;
  /** `expected`, split for highlighting. */
  segments: Segment[];
}

/** Trim, lowercase, collapse spaces, unify apostrophes, strip trailing punctuation. */
export function normalizeAnswer(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\s*'\s*/g, "'")
    .trim()
    .replace(/[\s.!?,;:…]+$/u, '')
    .trim();
}

/** Accent-insensitive form: NFD + drop combining marks, with the ligatures spelled out. */
export function foldDiacritics(text: string): string {
  return text
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .normalize('NFC');
}

/**
 * "nous allons" -> "allons", "j'ai mangé" -> "ai mangé". Returns null when
 * there's no leading pronoun to strip. The caller also keeps the unstripped
 * input as a candidate, since "nous nous levons" and "nous levons" are both
 * reasonable ways to type the nous form of se lever.
 */
function stripSubjectPronoun(text: string, pronouns: string[]): string | null {
  const longestFirst = [...pronouns].sort((a, b) => b.length - a.length);
  for (const pronoun of longestFirst) {
    if (pronoun.endsWith("'")) {
      if (text.startsWith(pronoun) && text.length > pronoun.length) {
        return text.slice(pronoun.length);
      }
    } else if (text.startsWith(`${pronoun} `)) {
      return text.slice(pronoun.length + 1);
    }
  }
  return null;
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

function mergeSegments(segments: Segment[]): Segment[] {
  const merged: Segment[] = [];
  for (const segment of segments) {
    const last = merged[merged.length - 1];
    if (last && last.mark === segment.mark) last.text += segment.text;
    else if (segment.text) merged.push({ ...segment });
  }
  return merged;
}

/**
 * For an "almost": walks `expected` against `typed` (which only differs in
 * accents) and marks each letter the learner didn't type exactly as
 * expected -- a missing accent, or a wrong one (è for é).
 */
export function markMissedAccents(expected: string, typed: string): Segment[] {
  const segments: Segment[] = [];
  let j = 0;
  for (const char of expected) {
    if (typed.startsWith(char, j)) {
      segments.push({ text: char, mark: false });
      j += char.length;
    } else {
      segments.push({ text: char, mark: true });
      // The typed side holds the folded letter(s) here: "oe" for "œ".
      j += foldDiacritics(char).length;
    }
  }
  return mergeSegments(segments);
}

/** Longest common subsequence of a and b, as index pairs [indexInA, indexInB]. */
function lcsPairs<T>(a: T[], b: T[]): [number, number][] {
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] =
        a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return pairs;
}

/**
 * At or below this share of a word's letters in common, a word is replaced
 * rather than misspelled, and is highlighted whole ("avons" vs "sommes")
 * instead of as scattered letters.
 */
const CHAR_DIFF_THRESHOLD = 0.5;

function sharedLetterRatio(expected: string, typed: string): number {
  return lcsPairs([...expected], [...typed]).length / [...expected].length;
}

function diffWord(expected: string, typed: string | undefined): Segment[] {
  if (typed === undefined || sharedLetterRatio(expected, typed) <= CHAR_DIFF_THRESHOLD) {
    return [{ text: expected, mark: true }];
  }
  const expectedChars = [...expected];
  const kept = new Set(lcsPairs(expectedChars, [...typed]).map(([i]) => i));
  return mergeSegments(expectedChars.map((char, i) => ({ text: char, mark: !kept.has(i) })));
}

/**
 * For a "wrong": highlights what differs between `expected` and `typed`.
 * Words are aligned first (identical words by longest common subsequence,
 * then each leftover expected word with the closest leftover typed word);
 * a word that's only misspelled ("allé" for "allés") gets character-level
 * highlighting instead of lighting up entirely, and a missing or replaced
 * word is highlighted whole.
 */
export function diffSegments(expected: string, typed: string): Segment[] {
  const expectedWords = expected.split(' ');
  const typedWords = typed.split(' ');

  const partner = new Map<number, number>(lcsPairs(expectedWords, typedWords));
  const usedTyped = new Set(partner.values());
  expectedWords.forEach((word, i) => {
    if (partner.has(i)) return;
    let best: number | undefined;
    let bestRatio = CHAR_DIFF_THRESHOLD;
    typedWords.forEach((candidate, j) => {
      if (usedTyped.has(j)) return;
      const ratio = sharedLetterRatio(word, candidate);
      if (ratio > bestRatio) {
        bestRatio = ratio;
        best = j;
      }
    });
    if (best !== undefined) {
      partner.set(i, best);
      usedTyped.add(best);
    }
  });

  const segments: Segment[] = [];
  expectedWords.forEach((word, i) => {
    if (i > 0) segments.push({ text: ' ', mark: false });
    const typedWord = partner.has(i) ? typedWords[partner.get(i)!] : undefined;
    segments.push(
      ...(typedWord === word ? [{ text: word, mark: false }] : diffWord(word, typedWord)),
    );
  });
  return mergeSegments(segments);
}

export function gradeConjugation(
  input: string,
  variants: string[],
  subjectPronouns: string[],
): GradeResult {
  const typed = normalizeAnswer(input);
  const stripped = stripSubjectPronoun(typed, subjectPronouns);
  const candidates = stripped === null ? [typed] : [typed, stripped];
  const accepted = variants.map((variant) => ({ variant, normalized: normalizeAnswer(variant) }));

  for (const { variant, normalized } of accepted) {
    if (candidates.includes(normalized)) {
      return { grade: 'correct', expected: variant, segments: [{ text: variant, mark: false }] };
    }
  }

  for (const { variant, normalized } of accepted) {
    const candidate = candidates.find((c) => foldDiacritics(c) === foldDiacritics(normalized));
    if (candidate !== undefined) {
      return {
        grade: 'almost',
        expected: variant,
        segments: markMissedAccents(normalized, candidate),
      };
    }
  }

  // Show the variant nearest to what was typed (ties keep the canonical
  // one), diffed against whichever candidate is closest to it.
  let best = {
    variant: variants[0],
    normalized: accepted[0]?.normalized ?? '',
    typed,
    distance: Infinity,
  };
  for (const { variant, normalized } of accepted) {
    for (const candidate of candidates) {
      const distance = levenshtein(normalized, candidate);
      if (distance < best.distance) best = { variant, normalized, typed: candidate, distance };
    }
  }
  return {
    grade: 'wrong',
    expected: best.variant,
    segments: diffSegments(best.normalized, best.typed),
  };
}
