import { useState } from 'react';

interface AddWordModalProps {
  languageName: string;
  familyNames: string[];
  onClose: () => void;
  onAddWord: (text: string, translationText: string, familyName: string) => void;
  onAddFamily: (name: string) => void;
}

type AddModalMode = 'word' | 'family';

const CREATE_NEW_FAMILY = '__create_new_family__';

export function AddWordModal({ languageName, familyNames, onClose, onAddWord, onAddFamily }: AddWordModalProps) {
  const [mode, setMode] = useState<AddModalMode>('word');
  const [wordText, setWordText] = useState('');
  const [translationText, setTranslationText] = useState('');
  const [newFamilyName, setNewFamilyName] = useState('');
  const [selectedFamily, setSelectedFamily] = useState(familyNames[0] ?? '');

  const submitWord = () => {
    if (!selectedFamily) return;
    onAddWord(wordText, translationText, selectedFamily);
    setWordText('');
    setTranslationText('');
  };

  const submitFamily = () => {
    onAddFamily(newFamilyName);
    setNewFamilyName('');
    setMode('word');
  };

  const handleFamilySelectChange = (value: string) => {
    if (value === CREATE_NEW_FAMILY) {
      const name = prompt('Enter new family name:');
      if (name && name.trim()) setSelectedFamily(name.trim());
      return;
    }
    setSelectedFamily(value);
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
          <label className="input-label">{mode === 'word' ? `New ${languageName} word` : 'Family Name'}</label>
          <input
            type="text"
            className="input-field"
            value={mode === 'word' ? wordText : newFamilyName}
            onChange={(e) => (mode === 'word' ? setWordText(e.target.value) : setNewFamilyName(e.target.value))}
            placeholder={mode === 'word' ? 'Type the word' : 'e.g. Colors, Furniture...'}
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
            value={translationText}
            onChange={(e) => setTranslationText(e.target.value)}
            placeholder="Type the translation"
            tabIndex={mode === 'word' ? 0 : -1}
            onKeyDown={(e) => e.key === 'Enter' && submitWord()}
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
          <label className="input-label">Family</label>
          <select
            className="input-field"
            value={selectedFamily}
            onChange={(e) => handleFamilySelectChange(e.target.value)}
            tabIndex={mode === 'word' ? 0 : -1}
          >
            {familyNames.length === 0 && (
              <option value="" disabled>
                No families yet
              </option>
            )}
            {familyNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value={CREATE_NEW_FAMILY}>+ Create New Family</option>
          </select>
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
