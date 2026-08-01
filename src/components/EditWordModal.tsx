import { useState } from 'react';
import type { VocabWord } from '../types/vocabWord';

interface EditWordModalProps {
  word: VocabWord;
  languageName: string;
  onClose: () => void;
  onSave: (wordId: number, text: string, translationText: string) => void;
}

export function EditWordModal({ word, languageName, onClose, onSave }: EditWordModalProps) {
  const [text, setText] = useState(word.text);
  const [translationText, setTranslationText] = useState(word.translation?.text ?? '');

  const submit = () => onSave(word.id, text, translationText);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Edit Word</div>
        <div className="input-group">
          <label className="input-label">{languageName} Word</label>
          <input type="text" className="input-field" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        </div>
        <div className="input-group">
          <label className="input-label">Translation</label>
          <input
            type="text"
            className="input-field"
            value={translationText}
            onChange={(e) => setTranslationText(e.target.value)}
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
