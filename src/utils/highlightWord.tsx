/**
 * Wraps every occurrence of `targetWord` in an example sentence with
 * <strong>, so it can be styled (red, per index.css `strong` rules under
 * .flashcard-example / .word-example-text) wherever an example sentence is
 * rendered. Only ever applied to the sentence's own-language text, never
 * its translation -- the target word doesn't appear in the translation.
 */

import type { ReactNode } from 'react';

function matchRegex(phrase: string): RegExp {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(${escaped})`, 'gi');
}

/** Lowercase and strip diacritics, so "Étudier" and "etudie" compare cleanly. */
function normalize(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

// Letters (plus combining marks) only -- apostrophes and hyphens split
// tokens, so "J'aime" yields "aime" and "S'habiller" yields "habiller".
const TOKEN_RE = /[\p{L}\p{M}]+/gu;

function commonPrefixLength(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }
  return prev[b.length];
}

/**
 * Whether sentence token `s` looks like an inflected form (or a near-miss
 * spelling) of target token `t`, both already normalized. Conjugations
 * mostly keep the stem and change the ending ("coucher" -> "couche",
 * "hablar" -> "hablo", "machen" -> "macht"), so a shared prefix covering
 * most of the target word is the main signal; a small edit distance also
 * catches typos in the saved word itself ("aprendre" vs. "apprendre").
 * Irregular stems ("venir" -> "viens", "gehen" -> "ging") won't match.
 */
function isFuzzyMatch(t: string, s: string): boolean {
  if (t === s) return true;
  const minPrefix = Math.max(3, Math.ceil(t.length * 0.6));
  if (commonPrefixLength(t, s) >= minPrefix) return true;
  const maxEdits = t.length >= 8 ? 2 : t.length >= 5 ? 1 : 0;
  return maxEdits > 0 && editDistance(t, s) <= maxEdits;
}

// Reflexive pronouns (French, Spanish, Italian, German), normalized. When
// the saved word is a reflexive verb ("se coucher", "s'habiller", "sich
// freuen"), the sentence usually swaps in a different person's pronoun
// ("Je me couche", "Je m'habille", "Ich freue mich"), so the pronoun can't
// be matched by spelling -- only by being one of these and sitting next to
// the matched verb.
const REFLEXIVE_PRONOUNS = new Set([
  'me',
  'te',
  'se',
  'nous',
  'vous',
  'm',
  't',
  's',
  'nos',
  'os',
  'mi',
  'ti',
  'si',
  'ci',
  'vi',
  'mich',
  'dich',
  'sich',
  'uns',
  'euch',
]);

// Only whitespace or an elision apostrophe between two tokens counts as
// adjacent ("me couche", "m'habille"), not punctuation like a comma.
const ADJACENT_GAP_RE = /^(\s+|['’])$/;

/**
 * Fallback when no exact phrase match exists: highlight each sentence token
 * that fuzzily matches one of the target's content words. Short tokens
 * (articles, reflexive pronouns like "se"/"sich") are ignored unless the
 * target has nothing longer, since they'd otherwise match unrelated words.
 * If the target is a reflexive verb, the sentence's pronoun right before
 * (or, failing that, right after) the matched verb is highlighted with it.
 */
function fuzzyHighlight(sentence: string, targetWord: string): ReactNode[] | null {
  const targetTokens = [...targetWord.matchAll(TOKEN_RE)].map((m) => normalize(m[0]));
  // A reflexive pronoun is never the word to match on ("sich" in "sich
  // freuen" is as long as a content word), unless it's all there is.
  const isReflexive =
    targetTokens.length > 1 && targetTokens.some((t) => REFLEXIVE_PRONOUNS.has(t));
  const candidates = isReflexive
    ? targetTokens.filter((t) => !REFLEXIVE_PRONOUNS.has(t))
    : targetTokens;
  const longest = Math.max(0, ...candidates.map((t) => t.length));
  const contentTokens = candidates.filter((t) => t.length >= Math.min(4, longest));
  if (contentTokens.length === 0) return null;

  const tokens = [...sentence.matchAll(TOKEN_RE)].map((m) => ({
    start: m.index,
    end: m.index + m[0].length,
    norm: normalize(m[0]),
  }));
  const isPronounAt = (i: number, a: number, b: number) =>
    tokens[i] !== undefined &&
    REFLEXIVE_PRONOUNS.has(tokens[i].norm) &&
    ADJACENT_GAP_RE.test(sentence.slice(tokens[a].end, tokens[b].start));

  const spans: { start: number; end: number }[] = [];
  tokens.forEach((token, i) => {
    if (!contentTokens.some((t) => isFuzzyMatch(t, token.norm))) return;
    let { start, end } = token;
    if (isReflexive) {
      if (isPronounAt(i - 1, i - 1, i)) start = tokens[i - 1].start;
      else if (isPronounAt(i + 1, i, i + 1)) end = tokens[i + 1].end;
    }
    spans.push({ start, end });
  });
  if (spans.length === 0) return null;

  const out: ReactNode[] = [];
  let last = 0;
  for (const { start, end } of spans) {
    if (start < last) continue;
    if (start > last) out.push(sentence.slice(last, start));
    out.push(<strong key={start}>{sentence.slice(start, end)}</strong>);
    last = end;
  }
  if (last < sentence.length) out.push(sentence.slice(last));
  return out;
}

export function highlightWord(sentence: string, targetWord: string | undefined) {
  if (!targetWord) return sentence;

  // Vocab entries can carry a leading article ("ein Faultier", "die Ente")
  // that a grammatically natural sentence won't always repeat verbatim
  // (different case/gender, or simply a different article) -- e.g. "ein
  // Faultier" the word vs. "Das Faultier schläft..." the sentence. Try the
  // full phrase first, then progressively drop leading words until one
  // matches, so the core word still gets highlighted even when the article
  // doesn't line up exactly.
  const words = targetWord.trim().split(/\s+/).filter(Boolean);
  for (let start = 0; start < words.length; start++) {
    const candidate = words.slice(start).join(' ');
    if (!candidate || !matchRegex(candidate).test(sentence)) continue;

    const parts = sentence.split(matchRegex(candidate));
    return parts.map((part, i) =>
      matchRegex(candidate).test(part) ? <strong key={i}>{part}</strong> : part,
    );
  }

  // No exact match -- usually a conjugated verb ("Se coucher" vs. "Je me
  // couche") or a typo in the saved word. Fall back to per-token fuzzy
  // matching.
  return fuzzyHighlight(sentence, targetWord) ?? sentence;
}
