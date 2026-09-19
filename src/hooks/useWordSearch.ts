import { useState } from 'react';
import type { LanguageId } from '../types/models';
import type { VocabWord } from '../types/vocabWord';
import { normalizeForSearch } from '../utils/searchText';

function wordMatchesQuery(word: VocabWord, normalizedQuery: string): boolean {
  if (normalizeForSearch(word.text).includes(normalizedQuery)) return true;
  const translation = word.translation?.text;
  return translation ? normalizeForSearch(translation).includes(normalizedQuery) : false;
}

/** Word search, scoped to whichever language is currently selected. */
export function useWordSearch(languageId: LanguageId | null, words: VocabWord[]) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Reset during render, same idiom as useVocabulary's language-switch reset --
  // a language change while this view stays mounted must clear a stale query
  // in the same pass, not flash it for a frame.
  const [syncedLanguageId, setSyncedLanguageId] = useState(languageId);
  if (languageId !== syncedLanguageId) {
    setSyncedLanguageId(languageId);
    setQuery('');
    setSearchOpen(false);
  }

  const trimmedQuery = query.trim();
  const results = trimmedQuery
    ? words.filter((word) => wordMatchesQuery(word, normalizeForSearch(trimmedQuery)))
    : [];

  const close = () => {
    setSearchOpen(false);
    setQuery('');
  };

  return {
    searchOpen,
    setSearchOpen,
    query,
    setQuery,
    trimmedQuery,
    results,
    totalWordCount: words.length,
    close,
  };
}
