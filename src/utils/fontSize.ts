export type FontSizeClass = 'size-small' | 'size-medium' | 'size-large' | 'size-xlarge';

/** Determines flashcard text size based on content length. */
export function getFontSizeClass(text: string | null | undefined): FontSizeClass {
  if (!text) return 'size-medium';
  const length = text.length;
  if (length <= 15) return 'size-small';
  if (length <= 25) return 'size-medium';
  if (length <= 40) return 'size-large';
  return 'size-xlarge';
}
