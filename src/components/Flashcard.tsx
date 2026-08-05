import type { VocabWord } from '../types/vocabWord';
import { getFontSizeClass } from '../utils/fontSize';
import { highlightWord } from '../utils/highlightWord';

interface FlashcardProps {
  word: VocabWord | undefined;
  className: string;
  isFlipped?: boolean;
  onClick?: () => void;
}

export function Flashcard({ word, className, isFlipped, onClick }: FlashcardProps) {
  return (
    <div className={className} onClick={onClick}>
      <div className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`}>
        <div className="flashcard-face flashcard-front">
          <div className={`flashcard-text ${getFontSizeClass(word?.text)}`}>{word?.text}</div>
        </div>
        <div className="flashcard-face flashcard-back">
          <div className={`flashcard-text ${getFontSizeClass(word?.translation?.text)}`}>{word?.translation?.text}</div>
          {word?.exampleSentence && (
            <>
              <div className="flashcard-divider" />
              <div className="flashcard-example">{highlightWord(word.exampleSentence.text, word.text)}</div>
              {word.exampleSentence.translationText && (
                <div className="flashcard-example-translation">{word.exampleSentence.translationText}</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
