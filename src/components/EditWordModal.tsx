import { useState } from 'react';
import type { VocabWord } from '../types/vocabWord';
import { WORD_TYPES, type WordType } from '../types/models';

interface EditWordModalProps {
  word: VocabWord;
  languageName: string;
  onClose: () => void;
  onSave: (
    wordId: number,
    text: string,
    translationText: string,
    partOfSpeech: WordType | null,
  ) => void;
}

export function EditWordModal({ word, languageName, onClose, onSave }: EditWordModalProps) {
  const [text, setText] = useState(word.text);
  const [translationText, setTranslationText] = useState(word.translation?.text ?? '');
  const [wordType, setWordType] = useState<WordType | ''>((word.partOfSpeech as WordType) ?? '');

  const submit = () => onSave(word.id, text, translationText, wordType || null);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Edit Word</div>
        <div className="input-group">
          <label className="input-label">{languageName} Word</label>
          <input
            type="text"
            className="input-field"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
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
        <div className="input-group">
          <label className="input-label">Word type (optional)</label>
          <select
            className="input-field"
            value={wordType}
            onChange={(e) => setWordType(e.target.value as WordType | '')}
          >
            <option value="">Not set</option>
            {WORD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type[0].toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
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
