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
}

export function Header({ view, syncStatus, languages, selectedLanguageId, onLanguageChange, onAddClick }: HeaderProps) {
  return (
    <div className="header">
      <SyncStatusIndicator status={syncStatus} />
      <div className="app-title">Families</div>
      <LanguageSelector languages={languages} selectedLanguageId={selectedLanguageId} onChange={onLanguageChange} />
      {view === 'families' && (
        <button className="add-button" onClick={onAddClick}>
          +
        </button>
      )}
    </div>
  );
}
