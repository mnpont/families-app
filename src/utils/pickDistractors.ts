import { shuffleArray } from './shuffleArray';

export interface DistractorCandidate {
  wordId: number;
  text: string;
}

/**
 * Selects up to `count` distractor translation strings for a multiple-choice
 * question, drawn from `pool` (see vocabularyApi.fetchVocabulary). Excludes
 * the correct word itself and anything case-insensitively identical to the
 * correct answer's own text, so two options can't secretly both be "right."
 * Returns fewer than `count` if the pool doesn't have enough distinct
 * candidates -- callers decide what to do with a short (or empty) result.
 */
export function pickDistractors(
  pool: DistractorCandidate[],
  correctWordId: number,
  correctText: string,
  count = 3
): string[] {
  const seen = new Set<string>([correctText.trim().toLowerCase()]);
  const candidates: string[] = [];

  for (const candidate of pool) {
    if (candidate.wordId === correctWordId) continue;
    const lower = candidate.text.trim().toLowerCase();
    if (!lower || seen.has(lower)) continue;
    seen.add(lower);
    candidates.push(candidate.text);
  }

  return shuffleArray(candidates).slice(0, count);
}
