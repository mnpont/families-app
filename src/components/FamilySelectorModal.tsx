import { useState } from 'react';

interface FamilySelectorModalProps {
  wordText: string;
  familyNames: string[];
  currentFamily: string;
  onClose: () => void;
  onSelectFamily: (name: string) => void;
}

export function FamilySelectorModal({
  wordText,
  familyNames,
  currentFamily,
  onClose,
  onSelectFamily,
}: FamilySelectorModalProps) {
  const [newFamilyOpen, setNewFamilyOpen] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');

  const confirmNewFamily = () => {
    const name = newFamilyName.trim();
    if (!name) return;
    onSelectFamily(name);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="move-to-family-modal" onClick={(e) => e.stopPropagation()}>
        <div className="move-to-family-title">Move "{wordText}" to&hellip;</div>
        <div className="family-chip-row">
          {familyNames
            .filter((name) => name !== currentFamily)
            .map((name) => (
              <div key={name} className="family-chip" onClick={() => onSelectFamily(name)}>
                {name}
              </div>
            ))}
          <div className="family-chip-new" onClick={() => setNewFamilyOpen((open) => !open)}>
            + New
          </div>
        </div>
        {newFamilyOpen && (
          <div className="family-chip-new-input-row">
            <input
              type="text"
              className="input-field"
              value={newFamilyName}
              onChange={(e) => setNewFamilyName(e.target.value)}
              placeholder="e.g. Colors"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && confirmNewFamily()}
            />
            <button
              type="button"
              className="button button-primary family-chip-new-confirm"
              onClick={confirmNewFamily}
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
