import type { SyncStatus } from '../hooks/useVocabulary';

const STATUS_LABEL: Record<SyncStatus, string> = {
  synced: 'Synced',
  syncing: 'Syncing...',
  error: 'Sync error',
};

export function SyncStatusIndicator({ status }: { status: SyncStatus }) {
  return (
    <div className="sync-status" role="status" aria-label={STATUS_LABEL[status]}>
      <div className={`sync-dot ${status}`}></div>
    </div>
  );
}
