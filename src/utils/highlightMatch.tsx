import { normalizeForSearch } from './searchText';

/**
 * Wraps the first case/accent-insensitive occurrence of `query` inside
 * `text` in <strong>, for word-search result highlighting. Falls back to
 * plain text if `text` itself has no match (e.g. the query only matched the
 * word's translation).
 */
export function highlightMatch(text: string, query: string) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return text;

  const index = normalizeForSearch(text).indexOf(normalizeForSearch(trimmedQuery));
  if (index === -1) return text;

  const before = text.slice(0, index);
  const match = text.slice(index, index + trimmedQuery.length);
  const after = text.slice(index + trimmedQuery.length);

  return (
    <>
      {before}
      <strong>{match}</strong>
      {after}
    </>
  );
}
