import { shuffleArray } from './shuffleArray';

export interface DistractorCandidate {
  wordId: number;
  text: string;
  deckName: string;
  partOfSpeech: string | null;
}

export interface PickDistractorsOptions {
  /** Ranked above a different-deck candidate -- same topic/register, the plausible-distractor principle from docs/phase2-exercise-methods.md #1.1. */
  preferredDeckName?: string;
  preferredPartOfSpeech?: string | null;
  /** Extra text to treat as already-taken, e.g. LLM distractors already chosen for this question -- see usePracticeSession.ts. Matched case-insensitively. */
  exclude?: string[];
}

/**
 * Selects up to `count` distractor translation strings for a multiple-choice
 * question, drawn from `pool` (see vocabularyApi.fetchVocabulary). Excludes
 * the correct word itself and anything case-insensitively identical to the
 * correct answer's own text (or `options.exclude`), so two options can't
 * secretly both be "right." Returns fewer than `count` if the pool doesn't
 * have enough distinct candidates -- callers decide what to do with a short
 * (or empty) result.
 *
 * This is the fallback for words without LLM-generated distractors
 * (words.llm_distractors, migration 015) -- picking purely at random tends
 * to produce obviously-wrong distractors, so candidates are ranked, not just
 * shuffled-and-sliced: same deck as the correct answer beats a different
 * deck, same part of speech beats a different one, and within a tier, closer
 * length to the correct answer beats a wildly different one. Ties still
 * resolve randomly (the pool is shuffled before sorting, and Array#sort is
 * stable), so the same word doesn't get the same distractors every time.
 */
export function pickDistractors(
  pool: DistractorCandidate[],
  correctWordId: number,
  correctText: string,
  count = 3,
  options: PickDistractorsOptions = {}
): string[] {
  const { preferredDeckName, preferredPartOfSpeech, exclude = [] } = options;
  const seen = new Set<string>([correctText.trim().toLowerCase(), ...exclude.map((text) => text.trim().toLowerCase())]);
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
