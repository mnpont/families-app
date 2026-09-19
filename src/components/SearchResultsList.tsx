import type { VocabWord } from '../types/vocabWord';
import { highlightMatch } from '../utils/highlightMatch';

interface SearchResultsListProps {
  query: string;
  results: VocabWord[];
  onSelectWord: (word: VocabWord) => void;
  onAddWord: (query: string) => void;
  onBack: () => void;
}

export function SearchResultsList({
  query,
  results,
  onSelectWord,
  onAddWord,
  onBack,
}: SearchResultsListProps) {
  const trimmed = query.trim();

  if (results.length === 0) {
    return (
      <div className="word-search-empty">
        <div className="word-search-empty-text">No word matches &ldquo;{trimmed}&rdquo;</div>
        <button type="button" className="word-search-add-button" onClick={() => onAddWord(trimmed)}>
          Add &ldquo;{trimmed}&rdquo;
        </button>
        <button type="button" className="word-search-back" onClick={onBack}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="word-search-results">
      {results.map((word) => (
        <div
          key={word.id}
          className="word-list-item word-search-result"
          onClick={() => onSelectWord(word)}
        >
          <div className="word-text">{highlightMatch(word.text, trimmed)}</div>
          <div className="word-translation">{word.translation?.text}</div>
          <div className="word-search-family">{word.deckName}</div>
        </div>
      ))}
      <div className="word-search-back-row">
        <button type="button" className="word-search-back" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
