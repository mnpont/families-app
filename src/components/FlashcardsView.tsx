import { useState } from 'react';
import { useReviewSession } from '../hooks/useReviewSession';
import type { Grade, LanguageId } from '../types/models';
import { Flashcard } from './Flashcard';

interface FlashcardsViewProps {
  languageId: LanguageId | null;
}

function highlightWord(sentence: string, targetWord: string | undefined) {
  if (!targetWord) return sentence;
  const escaped = targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = sentence.split(regex);
  return parts.map((part, i) => (regex.test(part) ? <strong key={i}>{part}</strong> : part));
}

const GRADE_BUTTONS: { grade: Grade; label: string; variant: 'button-secondary' | 'button-primary' }[] = [
  { grade: 'again', label: 'Again', variant: 'button-secondary' },
  { grade: 'hard', label: 'Hard', variant: 'button-secondary' },
  { grade: 'good', label: 'Good', variant: 'button-primary' },
  { grade: 'easy', label: 'Easy', variant: 'button-primary' },
];

export function FlashcardsView({ languageId }: FlashcardsViewProps) {
  const { cards, loading, submitting, submitGrade } = useReviewSession(languageId);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showExample, setShowExample] = useState(false);

  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Loading...</div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">All Caught Up</div>
        <div className="empty-state-text">Nothing due for review right now</div>
      </div>
    );
  }

  const currentCard = cards[0];

  const handleGrade = async (grade: Grade) => {
    if (submitting) return;
    await submitGrade(currentCard.id, grade);
    setIsFlipped(false);
    setShowExample(false);
  };

  return (
    <div className="flashcard-container">
      <div className="flashcard-stack">
        {/* Shadow card (empty - just for visual depth) */}
        <div className="flashcard shadow">
          <div className="flashcard-inner">
            <div className="flashcard-face flashcard-front"></div>
          </div>
        </div>

        <Flashcard word={currentCard} className="flashcard top" isFlipped={isFlipped} onClick={() => setIsFlipped(!isFlipped)} />
      </div>

      {currentCard.exampleSentence && (
        <div className={`example-reveal ${showExample ? 'revealed' : ''}`} onClick={() => setShowExample(!showExample)}>
          {!showExample ? (
            <div className="example-reveal-hint">Tap to see example</div>
          ) : (
            <div className="example-reveal-content">
              <div className="example-reveal-text">{highlightWord(currentCard.exampleSentence.text, currentCard.text)}</div>
              {currentCard.exampleSentence.translationText && (
                <div className="example-reveal-translation">{currentCard.exampleSentence.translationText}</div>
              )}
            </div>
          )}
        </div>
      )}

      {isFlipped && (
        <div className="flashcard-nav">
          {GRADE_BUTTONS.map(({ grade, label, variant }) => (
            <button key={grade} className={`button ${variant}`} onClick={() => handleGrade(grade)} disabled={submitting}>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
