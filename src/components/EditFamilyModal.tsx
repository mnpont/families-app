import { useState } from 'react';

interface EditFamilyModalProps {
  currentName: string;
  onClose: () => void;
  onSave: (oldName: string, newName: string) => void;
}

export function EditFamilyModal({ currentName, onClose, onSave }: EditFamilyModalProps) {
  const [name, setName] = useState(currentName);

  const submit = () => onSave(currentName, name);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Rename Family</div>
        <div className="input-group">
          <label className="input-label">Family Name</label>
          <input
            type="text"
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            autoFocus
          />
        </div>
        <div className="button-group">
          <button className="button button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button button-primary" onClick={submit}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
