import { useEffect, useRef } from 'react';
import type { LanguageId } from '../types/models';
import type { VocabWord } from '../types/vocabWord';
import { useWordSearch } from '../hooks/useWordSearch';
import { WordSearchBar } from './WordSearchBar';
import { SearchResultsList } from './SearchResultsList';

interface FamiliesViewProps {
  languageId: LanguageId | null;
  words: VocabWord[];
  families: Record<string, VocabWord[]>;
  familyNames: string[];
  hasAnyContent: boolean;
  onSelectFamily: (name: string) => void;
  onAddWordWithText: (text: string) => void;
}

/** Downward drag past this many px, starting from the content's scroll top, reveals the search bar. */
const PULL_OPEN_THRESHOLD = 40;
/** Upward drag past this many px (bar open, query empty) dismisses the search bar. */
const PULL_CLOSE_THRESHOLD = 30;
/**
 * Desktop equivalent of the touch pull gesture: scrolling up further while
 * already at the top of the list (nothing left to scroll into) opens the
 * bar, same as a downward touch drag. Trackpads report a wheel event per
 * few pixels, so deltas accumulate; a plain mouse wheel notch alone clears
 * either threshold in one event.
 */
const WHEEL_OPEN_THRESHOLD = 60;
const WHEEL_CLOSE_THRESHOLD = 60;
/** Gap after which a stalled wheel gesture no longer counts toward the next one. */
const WHEEL_ACCUMULATOR_RESET_MS = 200;

export function FamiliesView({
  languageId,
  words,
  families,
  familyNames,
  hasAnyContent,
  onSelectFamily,
  onAddWordWithText,
}: FamiliesViewProps) {
  const {
    searchOpen,
    setSearchOpen,
    query,
    setQuery,
    trimmedQuery,
    results,
    totalWordCount,
    close,
  } = useWordSearch(languageId, words);

  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchOpenRef = useRef(searchOpen);
  const trimmedQueryRef = useRef(trimmedQuery);

  useEffect(() => {
    searchOpenRef.current = searchOpen;
    trimmedQueryRef.current = trimmedQuery;
  }, [searchOpen, trimmedQuery]);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  // Native (non-React) touch/wheel listeners, so the handlers can call
  // preventDefault -- React attaches touch/wheel handlers as passive by
  // default, which would silently ignore it and let the page rubber-band
  // instead of driving the reveal. touchmove covers mobile drags, wheel
  // covers desktop trackpad/mouse scrolling.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    let dragging = false;
    let touchId: number | null = null;
    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop > 0) return;
      const touch = e.touches[0];
      touchId = touch.identifier;
      startY = touch.clientY;
      dragging = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!dragging) return;
      const touch = Array.from(e.touches).find((t) => t.identifier === touchId);
      if (!touch || el.scrollTop > 0) {
        dragging = false;
        return;
      }

      const delta = touch.clientY - startY;

      if (!searchOpenRef.current && delta > PULL_OPEN_THRESHOLD) {
        e.preventDefault();
        setSearchOpen(true);
        dragging = false;
      } else if (
        searchOpenRef.current &&
        !trimmedQueryRef.current &&
        delta < -PULL_CLOSE_THRESHOLD
      ) {
        e.preventDefault();
        close();
        inputRef.current?.blur();
        dragging = false;
      } else if (delta > 0 && !searchOpenRef.current) {
        // Prevent the bounce/rubber-band while we're still deciding whether
        // this drag is a reveal, so the list doesn't visibly scroll first.
        e.preventDefault();
      }
    };

    const onTouchEnd = () => {
      dragging = false;
      touchId = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    let wheelAccum = 0;
    let lastWheelTime = 0;

    const onWheel = (e: WheelEvent) => {
      if (el.scrollTop > 0) {
        wheelAccum = 0;
        return;
      }

      const now = performance.now();
      if (now - lastWheelTime > WHEEL_ACCUMULATOR_RESET_MS) wheelAccum = 0;
      lastWheelTime = now;

      if (!searchOpenRef.current) {
        if (e.deltaY >= 0) {
          wheelAccum = 0;
          return;
        }
        // Nothing above the list to scroll into anyway -- safe to swallow
        // while we decide whether this is a reveal gesture.
        e.preventDefault();
        wheelAccum += -e.deltaY;
        if (wheelAccum > WHEEL_OPEN_THRESHOLD) {
          setSearchOpen(true);
          wheelAccum = 0;
        }
      } else if (!trimmedQueryRef.current) {
        if (e.deltaY <= 0) {
          wheelAccum = 0;
          return;
        }
        wheelAccum += e.deltaY;
        if (wheelAccum > WHEEL_CLOSE_THRESHOLD) {
          close();
          inputRef.current?.blur();
          wheelAccum = 0;
        }
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      el.removeEventListener('wheel', onWheel);
    };
  }, [close, setSearchOpen]);

  if (!hasAnyContent) {
    return (
      <div className="content">
        <div className="empty-state">
          <div className="empty-state-title">Start Building Your Vocabulary</div>
          <div className="empty-state-text">Tap the + button to add your first word</div>
        </div>
      </div>
    );
  }

  return (
    <div className="content" ref={contentRef}>
      <WordSearchBar
        open={searchOpen}
        query={query}
        matchCount={results.length}
        totalWordCount={totalWordCount}
        inputRef={inputRef}
        onQueryChange={setQuery}
        onEmptyBlur={close}
        onEscape={close}
      />

      {trimmedQuery ? (
        <SearchResultsList
          query={query}
          results={results}
          onSelectWord={(word) => onSelectFamily(word.deckName)}
          onAddWord={onAddWordWithText}
          onBack={close}
        />
      ) : (
        <div className="family-list">
          {familyNames.map((familyName) => {
            const familyWords = families[familyName];
            const previewWords = familyWords.slice(0, 3);
            const overflowCount = familyWords.length - previewWords.length;

            return (
              <div
                key={familyName}
                className="family-list-row"
                onClick={() => onSelectFamily(familyName)}
              >
                <div>
                  <div className="family-list-name">{familyName}</div>
                  <div className="family-list-count">
                    {familyWords.length} word{familyWords.length === 1 ? '' : 's'}
                  </div>
                  <div className="family-list-chips">
                    {previewWords.map((word) => (
                      <div key={word.id} className="family-list-chip">
                        {word.text}
                      </div>
                    ))}
                    {overflowCount > 0 && (
                      <div className="family-list-chip overflow">+{overflowCount}</div>
                    )}
                  </div>
                </div>
                <div className="family-list-chevron">&rsaquo;</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
