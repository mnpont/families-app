import type { SyncStatus } from '../hooks/useVocabulary';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import type { View } from '../App';

interface HeaderProps {
  view: View;
  syncStatus: SyncStatus;
  onAddClick: () => void;
}

export function Header({ view, syncStatus, onAddClick }: HeaderProps) {
  return (
    <div className="header">
      <SyncStatusIndicator status={syncStatus} />
      <div className="app-title">Families</div>
      {view === 'families' && (
        <button className="add-button" onClick={onAddClick}>
          +
        </button>
      )}
    </div>
  );
}
