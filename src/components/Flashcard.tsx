import { useRef } from 'react';
import type { VocabWord } from '../types/vocabWord';
import { useFitText } from '../hooks/useFitText';
import { highlightWord } from '../utils/highlightWord';

interface FlashcardProps {
  word: VocabWord | undefined;
  className: string;
  isFlipped?: boolean;
  onClick?: () => void;
}

const MAX_FONT_SIZE = 42;
const MIN_FONT_SIZE = 18;

export function Flashcard({ word, className, isFlipped, onClick }: FlashcardProps) {
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const front = useFitText(frontRef, word?.text, {
    maxFontSize: MAX_FONT_SIZE,
    minFontSize: MIN_FONT_SIZE,
    checkHeight: true,
  });
  const back = useFitText(backRef, word?.translation?.text, {
    maxFontSize: MAX_FONT_SIZE,
    minFontSize: MIN_FONT_SIZE,
    checkHeight: true,
  });

  return (
    <div className={className} onClick={onClick}>
      <div className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`}>
        <div className="flashcard-face flashcard-front">
          <div
            ref={frontRef}
            className={`flashcard-text ${front.overflowing ? 'flashcard-text--overflowing' : ''}`}
            style={{ fontSize: front.fontSize }}
          >
            {word?.text}
          </div>
        </div>
        <div className="flashcard-face flashcard-back">
          <div
            ref={backRef}
            className={`flashcard-text ${back.overflowing ? 'flashcard-text--overflowing' : ''}`}
            style={{ fontSize: back.fontSize }}
          >
            {word?.translation?.text}
          </div>
          {word?.exampleSentence && (
            <>
              <div className="flashcard-divider" />
              <div className="flashcard-example">
                {highlightWord(word.exampleSentence.text, word.text)}
              </div>
              {word.exampleSentence.translationText && (
                <div className="flashcard-example-translation">
                  {word.exampleSentence.translationText}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
