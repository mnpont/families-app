import { useState } from 'react';

interface AddLanguageModalProps {
  onClose: () => void;
  onAddLanguage: (id: string, name: string) => void;
}

export function AddLanguageModal({ onClose, onAddLanguage }: AddLanguageModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const submit = () => {
    if (!name.trim() || !code.trim()) return;
    onAddLanguage(code, name);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Add Language</div>
        <div className="input-group">
          <label className="input-label">Language name</label>
          <input
            type="text"
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Italian"
            autoFocus
          />
        </div>
        <div className="input-group">
          <label className="input-label">Language code (ISO 639-1)</label>
          <input
            type="text"
            className="input-field"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. it"
            maxLength={5}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        <div className="button-group">
          <button className="button button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button button-primary" onClick={submit}>
            Add Language
          </button>
        </div>
      </div>
    </div>
  );
}
