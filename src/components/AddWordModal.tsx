import { useState } from 'react';

interface AddWordModalProps {
  onClose: () => void;
  onAddWord: (german: string, english: string) => void;
  onAddFamily: (name: string) => void;
}

type AddModalMode = 'word' | 'family';

export function AddWordModal({ onClose, onAddWord, onAddFamily }: AddWordModalProps) {
  const [mode, setMode] = useState<AddModalMode>('word');
  const [germanWord, setGermanWord] = useState('');
  const [englishWord, setEnglishWord] = useState('');
  const [newFamilyName, setNewFamilyName] = useState('');

  const submitWord = () => {
    onAddWord(germanWord, englishWord);
    setGermanWord('');
    setEnglishWord('');
  };

  const submitFamily = () => {
    onAddFamily(newFamilyName);
    setNewFamilyName('');
    setMode('word');
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-toggle">
          <button className={`modal-toggle-option ${mode === 'word' ? 'active' : ''}`} onClick={() => setMode('word')}>
            Add Word
          </button>
          <button
            className={`modal-toggle-option ${mode === 'family' ? 'active' : ''}`}
            onClick={() => setMode('family')}
          >
            Add Family
          </button>
        </div>
        <div className="input-group">
          <label className="input-label">{mode === 'word' ? 'German Word' : 'Family Name'}</label>
          <input
            type="text"
            className="input-field"
            value={mode === 'word' ? germanWord : newFamilyName}
            onChange={(e) => (mode === 'word' ? setGermanWord(e.target.value) : setNewFamilyName(e.target.value))}
            placeholder={mode === 'word' ? 'das Haus' : 'e.g. Colors, Furniture...'}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && mode === 'family' && submitFamily()}
          />
        </div>
        <div
          className="input-group"
          style={{
            opacity: mode === 'word' ? 1 : 0,
            pointerEvents: mode === 'word' ? 'auto' : 'none',
            transition: 'opacity 0.3s ease',
          }}
        >
          <label className="input-label">Translation</label>
          <input
            type="text"
            className="input-field"
            value={englishWord}
            onChange={(e) => setEnglishWord(e.target.value)}
            placeholder="the house"
            tabIndex={mode === 'word' ? 0 : -1}
            onKeyDown={(e) => e.key === 'Enter' && submitWord()}
          />
        </div>
        <div className="button-group">
          <button className="button button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button button-primary" onClick={mode === 'word' ? submitWord : submitFamily}>
            {mode === 'word' ? 'Add Word' : 'Add Family'}
          </button>
        </div>
      </div>
    </div>
  );
}
