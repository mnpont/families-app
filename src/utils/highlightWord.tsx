/**
 * Wraps every occurrence of `targetWord` in an example sentence with
 * <strong>, so it can be styled (red, per index.css `strong` rules under
 * .flashcard-example / .word-example-text) wherever an example sentence is
 * rendered. Only ever applied to the sentence's own-language text, never
 * its translation -- the target word doesn't appear in the translation.
 */
export function highlightWord(sentence: string, targetWord: string | undefined) {
  if (!targetWord) return sentence;
  const escaped = targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = sentence.split(regex);
  return parts.map((part, i) => (regex.test(part) ? <strong key={i}>{part}</strong> : part));
}
