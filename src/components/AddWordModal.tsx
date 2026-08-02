import { useState } from 'react';
import { lookupTranslation } from '../lib/lookupApi';
import { SearchIcon } from './icons/SearchIcon';
import type { LanguageId } from '../types/models';

interface AddWordModalProps {
  languageId: LanguageId | null;
  languageName: string;
  familyNames: string[];
  onClose: () => void;
  onAddWord: (text: string, translationText: string, familyName: string) => void;
  onAddFamily: (name: string) => void;
}

type AddModalMode = 'word' | 'family';

const CREATE_NEW_FAMILY = '__create_new_family__';

export function AddWordModal({ languageId, languageName, familyNames, onClose, onAddWord, onAddFamily }: AddWordModalProps) {
  const [mode, setMode] = useState<AddModalMode>('word');
  const [wordText, setWordText] = useState('');
  const [translationText, setTranslationText] = useState('');
  const [newFamilyName, setNewFamilyName] = useState('');
  const [selectedFamily, setSelectedFamily] = useState(familyNames[0] ?? '');
  const [isLookingUp, setIsLookingUp] = useState(false);

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

  const handleLookup = async () => {
    if (!languageId || !wordText.trim() || isLookingUp) return;

    setIsLookingUp(true);
    try {
      const suggestion = await lookupTranslation(wordText.trim(), languageId);
      if (suggestion) {
        // A suggestion, not a locked-in value -- it lands in the same
        // editable field manual typing uses, so it can be freely corrected
        // before Add Word is pressed.
        setTranslationText(suggestion);
      } else {
        alert('No suggestion found for that word. You can still enter the translation yourself.');
      }
    } catch (error) {
      console.error('Error looking up word:', error);
      alert('Lookup failed. Please enter the translation yourself.');
    } finally {
      setIsLookingUp(false);
    }
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
          <div className="input-field-wrapper">
            <input
              type="text"
              className="input-field"
              value={translationText}
              onChange={(e) => setTranslationText(e.target.value)}
              placeholder="Type the translation, or look it up"
              tabIndex={mode === 'word' ? 0 : -1}
              onKeyDown={(e) => e.key === 'Enter' && submitWord()}
            />
            <button
              type="button"
              className="input-icon-button"
              onClick={handleLookup}
              disabled={!languageId || !wordText.trim() || isLookingUp}
              title="Look up a suggested translation"
              tabIndex={mode === 'word' ? 0 : -1}
            >
              <SearchIcon />
            </button>
          </div>
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
