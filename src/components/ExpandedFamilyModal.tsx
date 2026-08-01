import { useState } from 'react';
import type { LegacyWord } from '../types/legacyWord';
import { FamiliesIcon } from './icons/FamiliesIcon';
import { PencilIcon } from './icons/PencilIcon';
import { DeleteIcon } from './icons/DeleteIcon';

interface ExpandedFamilyModalProps {
  familyName: string;
  words: LegacyWord[];
  onClose: () => void;
  onEditFamilyName: (oldName: string) => void;
  onDeleteFamily: (name: string) => void;
  onOpenFamilySelector: (wordId: number) => void;
  onEditWord: (word: LegacyWord) => void;
  onDeleteWord: (wordId: number) => void;
}

export function ExpandedFamilyModal({
  familyName,
  words,
  onClose,
  onEditFamilyName,
  onDeleteFamily,
  onOpenFamilySelector,
  onEditWord,
  onDeleteWord,
}: ExpandedFamilyModalProps) {
  const [isEditMode, setIsEditMode] = useState(false);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="expanded-family" onClick={(e) => e.stopPropagation()}>
        <div className="expanded-family-header">
          <div className="expanded-family-title-section">
            <div className="expanded-family-title">{familyName}</div>
            {isEditMode && (
              <>
                <button
                  className="family-action-button edit-name"
                  onClick={() => onEditFamilyName(familyName)}
                  title="Rename family"
                >
                  <PencilIcon />
                </button>
                <button
                  className="family-action-button delete-family"
                  onClick={() => onDeleteFamily(familyName)}
                  title="Delete family"
                >
                  <DeleteIcon />
                </button>
              </>
            )}
          </div>
          <button
            className={`edit-button ${isEditMode ? 'active' : ''}`}
            onClick={() => setIsEditMode(!isEditMode)}
            title="Edit mode"
          >
            <PencilIcon />
          </button>
        </div>
        {words.map((word) => (
          <div key={word.id} className={`word-list-item ${isEditMode ? 'edit-mode' : ''}`}>
            {isEditMode && (
              <button
                className="word-family-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenFamilySelector(word.id);
                }}
              >
                <FamiliesIcon />
              </button>
            )}
            <div className="word-german">{word.german}</div>
            <div className="word-english">{word.english}</div>
            {word.exampleSentenceDe && !isEditMode && (
              <div className="word-example">
                <span className="word-example-de">{word.exampleSentenceDe}</span>
                {word.exampleSentenceEn && <span className="word-example-en"> — {word.exampleSentenceEn}</span>}
              </div>
            )}
            {isEditMode && (
              <div className="word-action-buttons">
                <button className="action-button edit" onClick={() => onEditWord(word)}>
                  <PencilIcon />
                </button>
                <button className="action-button delete" onClick={() => onDeleteWord(word.id)}>
                  <DeleteIcon />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
