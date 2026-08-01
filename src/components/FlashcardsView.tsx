import { useEffect, useState } from 'react';
import type { VocabWord } from '../types/vocabWord';
import { shuffleArray } from '../utils/shuffleArray';
import { Flashcard } from './Flashcard';

interface FlashcardsViewProps {
  words: VocabWord[];
}

function highlightWord(sentence: string, targetWord: string | undefined) {
  if (!targetWord) return sentence;
  const escaped = targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = sentence.split(regex);
  return parts.map((part, i) => (regex.test(part) ? <strong key={i}>{part}</strong> : part));
}

export function FlashcardsView({ words }: FlashcardsViewProps) {
  const [shuffledWords, setShuffledWords] = useState<VocabWord[]>([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationClass, setAnimationClass] = useState<'' | 'next' | 'prev'>('');
  const [showExample, setShowExample] = useState(false);

  useEffect(() => {
    if (words.length > 0) {
      setShuffledWords(shuffleArray(words));
      setCurrentFlashcardIndex(0);
      setIsFlipped(false);
    }
  }, [words]);

  if (words.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">No Words Yet</div>
        <div className="empty-state-text">Add some words to start practicing</div>
      </div>
    );
  }

  if (shuffledWords.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Loading...</div>
      </div>
    );
  }

  const handleNextFlashcard = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setIsFlipped(false);
    setShowExample(false);
    setAnimationClass('next');

    setTimeout(() => {
      setCurrentFlashcardIndex((prev) => (prev + 1) % shuffledWords.length);
      setAnimationClass('');
      setIsAnimating(false);
    }, 300);
  };

  const handlePrevFlashcard = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setIsFlipped(false);
    setShowExample(false);
    setAnimationClass('prev');

    setTimeout(() => {
      setCurrentFlashcardIndex((prev) => (prev - 1 + shuffledWords.length) % shuffledWords.length);
      setAnimationClass('');
      setIsAnimating(false);
    }, 300);
  };

  const currentWord = shuffledWords[currentFlashcardIndex];

  let currentCardClass = 'flashcard ';
  if (animationClass === 'next') currentCardClass += 'slide-out-right';
  else if (animationClass === 'prev') currentCardClass += 'slide-out-left';
  else currentCardClass += 'top';

  let incomingWord: VocabWord | undefined;
  let incomingClass = '';
  if (animationClass) {
    const newIndex =
      animationClass === 'next'
        ? (currentFlashcardIndex + 1) % shuffledWords.length
        : (currentFlashcardIndex - 1 + shuffledWords.length) % shuffledWords.length;
    incomingWord = shuffledWords[newIndex];
    incomingClass = `flashcard ${animationClass === 'next' ? 'slide-in-left' : 'slide-in-right'}`;
  }

  return (
    <div className="flashcard-container">
      <div className="flashcard-stack">
        {/* Shadow card (empty - just for visual depth) */}
        <div className="flashcard shadow">
          <div className="flashcard-inner">
            <div className="flashcard-face flashcard-front"></div>
          </div>
        </div>

        <Flashcard
          word={currentWord}
          className={currentCardClass}
          isFlipped={isFlipped}
          onClick={() => !isAnimating && setIsFlipped(!isFlipped)}
        />

        {animationClass && <Flashcard word={incomingWord} className={incomingClass} />}
      </div>

      {currentWord?.exampleSentence && (
        <div className={`example-reveal ${showExample ? 'revealed' : ''}`} onClick={() => setShowExample(!showExample)}>
          {!showExample ? (
            <div className="example-reveal-hint">Tap to see example</div>
          ) : (
            <div className="example-reveal-content">
              <div className="example-reveal-text">{highlightWord(currentWord.exampleSentence.text, currentWord.text)}</div>
              {currentWord.exampleSentence.translationText && (
                <div className="example-reveal-translation">{currentWord.exampleSentence.translationText}</div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flashcard-nav">
        <button className="flashcard-nav-button" onClick={handlePrevFlashcard} disabled={isAnimating}>
          Back
        </button>
        <button className="flashcard-nav-button" onClick={handleNextFlashcard} disabled={isAnimating}>
          Next
        </button>
      </div>
    </div>
  );
}
