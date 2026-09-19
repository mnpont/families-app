import type { RefObject } from 'react';
import { SearchIcon } from './icons/SearchIcon';

interface WordSearchBarProps {
  open: boolean;
  query: string;
  matchCount: number;
  totalWordCount: number;
  inputRef: RefObject<HTMLInputElement>;
  onQueryChange: (value: string) => void;
  onEmptyBlur: () => void;
  onEscape: () => void;
}

export function WordSearchBar({
  open,
  query,
  matchCount,
  totalWordCount,
  inputRef,
  onQueryChange,
  onEmptyBlur,
  onEscape,
}: WordSearchBarProps) {
  const trimmed = query.trim();
  const note = !trimmed
    ? `Search ${totalWordCount} word${totalWordCount === 1 ? '' : 's'}`
    : matchCount === 0
      ? 'No matches'
      : `${matchCount} match${matchCount === 1 ? '' : 'es'}`;

  return (
    <div className={`word-search-bar-wrap ${open ? 'word-search-bar-wrap--open' : ''}`}>
      <div className="word-search-bar-inner">
        <div className="word-search-bar">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            className="word-search-input"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onBlur={() => !query.trim() && onEmptyBlur()}
            onKeyDown={(e) => e.key === 'Escape' && onEscape()}
            placeholder="Search words"
          />
          <div className="word-search-count">{note}</div>
        </div>
      </div>
    </div>
  );
}
