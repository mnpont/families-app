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
}

export function Header({
  view,
  syncStatus,
  languages,
  selectedLanguageId,
  onLanguageChange,
  onAddClick,
  onAddFamilyClick,
}: HeaderProps) {
  const [languageBarOpen, setLanguageBarOpen] = useState(false);

  return (
    <div className="header">
      <SyncStatusIndicator status={syncStatus} />
      <div className="header-title-group">
        <div
          className="app-title app-title--clickable"
          onClick={() => setLanguageBarOpen((open) => !open)}
        >
          Families
        </div>
        <div className={`language-bar ${languageBarOpen ? 'language-bar--open' : ''}`}>
          <div className="language-bar-content">
            <LanguageSelector
              languages={languages}
              selectedLanguageId={selectedLanguageId}
              onChange={(languageId) => {
                onLanguageChange(languageId);
                setLanguageBarOpen(false);
              }}
            />
            <button className="language-bar-add" onClick={onAddFamilyClick} aria-label="Add family">
              +
            </button>
          </div>
        </div>
      </div>
      {view === 'families' && (
        <button className="add-button" onClick={onAddClick}>
          +
        </button>
      )}
    </div>
  );
}
