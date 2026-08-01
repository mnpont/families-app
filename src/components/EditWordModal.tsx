import { useState } from 'react';
import type { LegacyWord } from '../types/legacyWord';

interface EditWordModalProps {
  word: LegacyWord;
  onClose: () => void;
  onSave: (wordId: number, german: string, english: string) => void;
}

export function EditWordModal({ word, onClose, onSave }: EditWordModalProps) {
  const [german, setGerman] = useState(word.german);
  const [english, setEnglish] = useState(word.english);

  const submit = () => onSave(word.id, german, english);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Edit Word</div>
        <div className="input-group">
          <label className="input-label">German Word</label>
          <input type="text" className="input-field" value={german} onChange={(e) => setGerman(e.target.value)} autoFocus />
        </div>
        <div className="input-group">
          <label className="input-label">Translation</label>
          <input
            type="text"
            className="input-field"
            value={english}
            onChange={(e) => setEnglish(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
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
