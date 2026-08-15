import { useState, type CSSProperties } from 'react';
import { lookupTranslation } from '../lib/lookupApi';
import { SearchIcon } from './icons/SearchIcon';
import { WORD_TYPES, type LanguageId, type WordType } from '../types/models';

interface AddWordModalProps {
  languageId: LanguageId | null;
  languageName: string;
  familyNames: string[];
  initialMode?: AddModalMode;
  onClose: () => void;
  onAddWord: (text: string, translationText: string, familyName: string, partOfSpeech: WordType | null) => void;
  onAddFamily: (name: string) => void;
  onAddLanguage: (id: string, name: string) => void;
}

type AddModalMode = 'word' | 'family' | 'language';

/** Fades a field group out without unmounting it, so the modal's height stays constant across all three modes. */
function fadeStyle(active: boolean): CSSProperties {
  return {
    opacity: active ? 1 : 0,
    pointerEvents: active ? 'auto' : 'none',
    transition: 'opacity 0.3s ease',
  };
}

export function AddWordModal({
  languageId,
  languageName,
  familyNames,
  initialMode = 'word',
  onClose,
  onAddWord,
  onAddFamily,
  onAddLanguage,
}: AddWordModalProps) {
  const [mode, setMode] = useState<AddModalMode>(initialMode);
  const [wordText, setWordText] = useState('');
  const [translationText, setTranslationText] = useState('');
  const [wordType, setWordType] = useState<WordType | ''>('');
  const [newFamilyName, setNewFamilyName] = useState('');
  const [selectedFamily, setSelectedFamily] = useState(familyNames[0] ?? '');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [newFamilyChipOpen, setNewFamilyChipOpen] = useState(false);
  const [newFamilyChipText, setNewFamilyChipText] = useState('');
  const [newLanguageName, setNewLanguageName] = useState('');
  const [newLanguageCode, setNewLanguageCode] = useState('');

  const submitWord = () => {
    if (!selectedFamily) return;
    onAddWord(wordText, translationText, selectedFamily, wordType || null);
    setWordText('');
    setTranslationText('');
    setWordType('');
  };

  const submitFamily = () => {
    onAddFamily(newFamilyName);
    setNewFamilyName('');
    setMode('word');
  };

  const submitLanguage = () => {
    if (!newLanguageName.trim() || !newLanguageCode.trim()) return;
    onAddLanguage(newLanguageCode, newLanguageName);
    setNewLanguageName('');
    setNewLanguageCode('');
    setMode('word');
  };

  const confirmNewFamilyChip = () => {
    const name = newFamilyChipText.trim();
    if (!name) return;
    setSelectedFamily(name);
    setNewFamilyChipOpen(false);
    setNewFamilyChipText('');
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

  const submit = mode === 'word' ? submitWord : mode === 'family' ? submitFamily : submitLanguage;
  const submitLabel = mode === 'word' ? 'Add Word' : mode === 'family' ? 'Add Family' : 'Add Language';

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-toggle">
          <button className={`modal-toggle-option ${mode === 'word' ? 'active' : ''}`} onClick={() => setMode('word')}>
            Add Word
          </button>
          <button className={`modal-toggle-option ${mode === 'family' ? 'active' : ''}`} onClick={() => setMode('family')}>
            Add Family
          </button>
          <button className={`modal-toggle-option ${mode === 'language' ? 'active' : ''}`} onClick={() => setMode('language')}>
            Add Language
          </button>
        </div>
        <div className="input-group" style={fadeStyle(mode !== 'language')}>
          <label className="input-label">{mode === 'word' ? `New ${languageName} word` : 'Family Name'}</label>
          <input
            type="text"
            className="input-field"
            value={mode === 'word' ? wordText : newFamilyName}
            onChange={(e) => (mode === 'word' ? setWordText(e.target.value) : setNewFamilyName(e.target.value))}
            placeholder={mode === 'word' ? 'Type the word' : 'e.g. Colors, Furniture...'}
            autoFocus={mode !== 'language'}
            tabIndex={mode !== 'language' ? 0 : -1}
            onKeyDown={(e) => e.key === 'Enter' && mode === 'family' && submitFamily()}
          />
        </div>
        <div className="input-group" style={fadeStyle(mode === 'word')}>
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
        <div className="input-group" style={fadeStyle(mode === 'word')}>
          <label className="input-label">Word type (optional)</label>
          <select
            className="input-field"
            value={wordType}
            onChange={(e) => setWordType(e.target.value as WordType | '')}
            tabIndex={mode === 'word' ? 0 : -1}
          >
            <option value="">Not set</option>
            {WORD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type[0].toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="input-group" style={fadeStyle(mode === 'word')}>
          <label className="input-label">Family</label>
          <div className="family-chip-row">
            {familyNames.map((name) => (
              <div
                key={name}
                className={`family-chip ${selectedFamily === name ? 'active' : ''}`}
                onClick={() => setSelectedFamily(name)}
              >
                {name}
              </div>
            ))}
            <div className="family-chip-new" onClick={() => setNewFamilyChipOpen((open) => !open)}>
              + New
            </div>
          </div>
          {newFamilyChipOpen && (
            <div className="family-chip-new-input-row">
              <input
                type="text"
                className="input-field"
                value={newFamilyChipText}
                onChange={(e) => setNewFamilyChipText(e.target.value)}
                placeholder="e.g. Colors"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && confirmNewFamilyChip()}
              />
              <button type="button" className="button button-primary family-chip-new-confirm" onClick={confirmNewFamilyChip}>
                Add
              </button>
            </div>
          )}
        </div>
        <div className="input-group" style={fadeStyle(mode === 'language')}>
          <label className="input-label">Language name</label>
          <input
            type="text"
            className="input-field"
            value={newLanguageName}
            onChange={(e) => setNewLanguageName(e.target.value)}
            placeholder="e.g. Italian"
            tabIndex={mode === 'language' ? 0 : -1}
          />
        </div>
        <div className="input-group" style={fadeStyle(mode === 'language')}>
          <label className="input-label">Language code (ISO 639-1)</label>
          <input
            type="text"
            className="input-field"
            value={newLanguageCode}
            onChange={(e) => setNewLanguageCode(e.target.value)}
            placeholder="e.g. it"
            maxLength={5}
            tabIndex={mode === 'language' ? 0 : -1}
            onKeyDown={(e) => e.key === 'Enter' && submitLanguage()}
          />
        </div>
        <div className="button-group">
          <button className="button button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button button-primary" onClick={submit}>
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
