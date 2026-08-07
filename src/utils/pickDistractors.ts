import { shuffleArray } from './shuffleArray';

export interface DistractorCandidate {
  wordId: number;
  text: string;
  deckName: string;
  partOfSpeech: string | null;
}

/**
 * Selects up to `count` distractor translation strings for a multiple-choice
 * question, drawn from `pool` (see vocabularyApi.fetchVocabulary). Excludes
 * the correct word itself and anything case-insensitively identical to the
 * correct answer's own text, so two options can't secretly both be "right."
 * Returns fewer than `count` if the pool doesn't have enough distinct
 * candidates -- callers decide what to do with a short (or empty) result.
 *
 * Picking purely at random (the original v1 behavior) tends to produce
 * obviously-wrong distractors -- a word from a totally unrelated deck, or a
 * four-word phrase sitting next to three single words, gives the answer away
 * without the learner ever having to discriminate. So candidates are ranked,
 * not just shuffled-and-sliced: same deck as the correct answer beats a
 * different deck (same topic/register, the plausible-distractor principle
 * from docs/phase2-exercise-methods.md #1.1), and within a tier, closer
 * length to the correct answer beats a wildly different one. Ties still
 * resolve randomly (the pool is shuffled before sorting, and Array#sort is
 * stable), so the same word doesn't get the same three distractors every time.
 */
export function pickDistractors(
  pool: DistractorCandidate[],
  correctWordId: number,
  correctText: string,
  count = 3,
  preferredDeckName?: string,
  preferredPartOfSpeech?: string | null
): string[] {
  const seen = new Set<string>([correctText.trim().toLowerCase()]);
  const candidates: DistractorCandidate[] = [];

  for (const candidate of pool) {
    if (candidate.wordId === correctWordId) continue;
    const lower = candidate.text.trim().toLowerCase();
    if (!lower || seen.has(lower)) continue;
    seen.add(lower);
    candidates.push(candidate);
  }

  return shuffleArray(candidates)
    .map((candidate) => ({
      text: candidate.text,
      deckRank: preferredDeckName && candidate.deckName === preferredDeckName ? 0 : 1,
      posRank: preferredPartOfSpeech && candidate.partOfSpeech === preferredPartOfSpeech ? 0 : 1,
      lengthDiff: Math.abs(candidate.text.length - correctText.length),
    }))
    .sort((a, b) => a.deckRank - b.deckRank || a.posRank - b.posRank || a.lengthDiff - b.lengthDiff)
    .slice(0, count)
    .map((ranked) => ranked.text);
}
