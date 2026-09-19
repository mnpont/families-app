/**
 * Wraps every occurrence of `targetWord` in an example sentence with
 * <strong>, so it can be styled (red, per index.css `strong` rules under
 * .flashcard-example / .word-example-text) wherever an example sentence is
 * rendered. Only ever applied to the sentence's own-language text, never
 * its translation -- the target word doesn't appear in the translation.
 */

function matchRegex(phrase: string): RegExp {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(${escaped})`, 'gi');
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

  return sentence;
}
