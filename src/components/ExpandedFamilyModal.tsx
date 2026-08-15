import { useEffect, useRef, useState } from 'react';
import type { VocabWord } from '../types/vocabWord';
import { FamiliesIcon } from './icons/FamiliesIcon';
import { PencilIcon } from './icons/PencilIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import { highlightWord } from '../utils/highlightWord';
import { GENDER_LABELS, GENDER_LANGUAGES } from '../utils/parseGender';
import { isGenderEligible } from '../lib/genderApi';

/**
 * A resolved gender is its own proof the word is a noun (genderApi.ts only
 * ever resolves one via Wikidata's lexicalCategory=noun filter or an
 * article that's noun-exclusive), so that always shows a chip with no
 * dependency on part_of_speech having been set by hand -- unless the word
 * is explicitly tagged as something else, which always wins (isGenderEligible).
 * The *missing* "gender?" flag is different -- without a resolved gender
 * there's no automatic signal this is a noun at all, so it only appears
 * once the word is explicitly tagged as one, to avoid flagging every
 * verb/adjective as "missing" its gender.
 */
function showsGenderChip(word: VocabWord): boolean {
  if (!GENDER_LANGUAGES.includes(word.languageId) || !isGenderEligible(word.partOfSpeech)) return false;
  return word.gender !== null || word.partOfSpeech === 'noun';
}

interface ExpandedFamilyModalProps {
  familyName: string;
  words: VocabWord[];
  onClose: () => void;
  onEditFamilyName: (oldName: string) => void;
  onDeleteFamily: (name: string) => void;
  onOpenFamilySelector: (wordId: number) => void;
  onEditWord: (word: VocabWord) => void;
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
  const [confirmingDeleteWordId, setConfirmingDeleteWordId] = useState<number | null>(null);
  const [confirmingDeleteFamily, setConfirmingDeleteFamily] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkOverflow = () => setShowBottomFade(el.scrollHeight > el.clientHeight + 1);
    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [words, isEditMode, confirmingDeleteFamily]);

  const exitEditMode = () => {
    setIsEditMode(false);
    setConfirmingDeleteWordId(null);
    setConfirmingDeleteFamily(false);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="expanded-family" onClick={(e) => e.stopPropagation()}>
        <button className="expanded-family-close" onClick={onClose} title="Close">
          <DeleteIcon />
        </button>

        <div className="expanded-family-scroll" ref={scrollRef}>
          <div className="expanded-family-title">{familyName}</div>

          {!isEditMode && (
            <div className="expanded-family-meta">
              <div className="expanded-family-count-pill">
                {words.length} word{words.length === 1 ? '' : 's'}
              </div>
              <button className="edit-toggle-pill" onClick={() => setIsEditMode(true)}>
                Edit
              </button>
            </div>
          )}

          {isEditMode && confirmingDeleteFamily && (
            <div className="delete-confirm-bar family-delete-confirm">
              <span>Delete "{familyName}"?</span>
              <div className="delete-confirm-actions">
                <button className="delete-confirm-cancel" onClick={() => setConfirmingDeleteFamily(false)}>
                  Cancel
                </button>
                <button
                  className="delete-confirm-delete"
                  onClick={() => {
                    setConfirmingDeleteFamily(false);
                    onDeleteFamily(familyName);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          {isEditMode && !confirmingDeleteFamily && (
            <div className="expanded-family-actions">
              <button className="family-action-pill rename" onClick={() => onEditFamilyName(familyName)}>
                <PencilIcon />
                Rename
              </button>
              <button className="family-action-pill delete" onClick={() => setConfirmingDeleteFamily(true)}>
                Delete family
              </button>
              <button className="edit-toggle-pill active" onClick={exitEditMode}>
                Editing
              </button>
            </div>
          )}

          {words.map((word) => {
            if (isEditMode && confirmingDeleteWordId === word.id) {
              return (
                <div key={word.id} className="delete-confirm-bar word-delete-confirm">
                  <span>Delete "{word.text}"?</span>
                  <div className="delete-confirm-actions">
                    <button className="delete-confirm-cancel" onClick={() => setConfirmingDeleteWordId(null)}>
                      Cancel
                    </button>
                    <button
                      className="delete-confirm-delete"
                      onClick={() => {
                        setConfirmingDeleteWordId(null);
                        onDeleteWord(word.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            }

            const genderChip = showsGenderChip(word);
            const genderClass = word.gender ?? 'missing';
            const genderLabel = word.gender ? GENDER_LABELS[word.gender] : 'gender?';

            return (
              <div
                key={word.id}
                className={`word-list-item ${isEditMode ? 'edit-mode' : ''} ${genderChip && !word.gender ? 'gender-missing' : ''}`}
              >
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
                {isEditMode ? (
                  <div className="word-edit-line">
                    {word.text} <span className="word-edit-translation">{word.translation?.text}</span>
                  </div>
                ) : (
                  <>
                    <div className="word-text-row">
                      <div className="word-text">{word.text}</div>
                      {genderChip && (
                        <span
                          className={`word-gender-chip ${genderClass}`}
                          {...(!word.gender ? { onClick: () => onEditWord(word), role: 'button', tabIndex: 0 } : {})}
                        >
                          {genderLabel}
                        </span>
                      )}
                    </div>
                    <div className="word-translation">{word.translation?.text}</div>
                    {word.exampleSentence && (
                      <div className="word-example">
                        <span className="word-example-text">{highlightWord(word.exampleSentence.text, word.text)}</span>
                        {word.exampleSentence.translationText && (
                          <span className="word-example-translation"> — {word.exampleSentence.translationText}</span>
                        )}
                      </div>
                    )}
                  </>
                )}
                {isEditMode && (
                  <div className="word-action-buttons">
                    <button className="action-button edit" onClick={() => onEditWord(word)}>
                      <PencilIcon />
                    </button>
                    <button className="action-button delete" onClick={() => setConfirmingDeleteWordId(word.id)}>
                      <DeleteIcon />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {showBottomFade && <div className="expanded-family-fade" />}
        </div>
      </div>
    </div>
  );
}
