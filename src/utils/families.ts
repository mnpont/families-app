import type { LegacyWord } from '../types/legacyWord';

export function getFamilies(words: LegacyWord[], emptyFamilies: string[]): Record<string, LegacyWord[]> {
  const familyMap: Record<string, LegacyWord[]> = {};
  emptyFamilies.forEach((name) => {
    familyMap[name] = [];
  });
  words.forEach((word) => {
    if (!familyMap[word.family]) {
      familyMap[word.family] = [];
    }
    familyMap[word.family].push(word);
  });
  return familyMap;
}
