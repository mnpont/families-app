import type { SyncStatus } from '../hooks/useVocabulary';

export function SyncStatusIndicator({ status }: { status: SyncStatus }) {
  return (
    <div className="sync-status">
      <div className={`sync-dot ${status}`}></div>
      <span>
        {status === 'synced' && 'Synced'}
        {status === 'syncing' && 'Syncing...'}
        {status === 'error' && 'Sync error'}
      </span>
    </div>
  );
}
