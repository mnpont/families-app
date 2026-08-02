import { useState } from 'react';
import type { SyncStatus } from '../hooks/useVocabulary';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { LanguageSelector } from './LanguageSelector';
import type { Language, LanguageId } from '../types/models';
import type { View } from '../App';

interface HeaderProps {
  view: View;
  syncStatus: SyncStatus;
  languages: Language[];
  selectedLanguageId: LanguageId | null;
  onLanguageChange: (languageId: LanguageId) => void;
  onAddClick: () => void;
  onAddFamilyClick: () => void;
  onAddLanguageClick: () => void;
}

export function Header({
  view,
  syncStatus,
  languages,
  selectedLanguageId,
  onLanguageChange,
  onAddClick,
  onAddFamilyClick,
  onAddLanguageClick,
}: HeaderProps) {
  const [languageBarOpen, setLanguageBarOpen] = useState(false);
  const isFlashcardsView = view === 'flashcards';

  return (
    <div className="header">
      <SyncStatusIndicator status={syncStatus} />
      <div className="header-title-group">
        <div
          className={`app-title ${isFlashcardsView ? 'app-title--clickable' : ''}`}
          onClick={() => isFlashcardsView && setLanguageBarOpen((open) => !open)}
        >
          Families
        </div>
        {isFlashcardsView ? (
          <div className={`language-bar ${languageBarOpen ? 'language-bar--open' : ''}`}>
            <div className="language-bar-content">
              <LanguageSelector
                languages={languages}
                selectedLanguageId={selectedLanguageId}
                onChange={(languageId) => {
                  onLanguageChange(languageId);
                  setLanguageBarOpen(false);
                }}
                onAddLanguageClick={onAddLanguageClick}
              />
              <button className="language-bar-add" onClick={onAddFamilyClick} aria-label="Add family">
                +
              </button>
            </div>
          </div>
        ) : (
          <LanguageSelector
            languages={languages}
            selectedLanguageId={selectedLanguageId}
            onChange={onLanguageChange}
            onAddLanguageClick={onAddLanguageClick}
          />
        )}
      </div>
      {view === 'families' && (
        <button className="add-button" onClick={onAddClick}>
          +
        </button>
      )}
    </div>
  );
}
