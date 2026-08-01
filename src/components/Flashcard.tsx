import type { VocabWord } from '../types/vocabWord';
import { getFontSizeClass } from '../utils/fontSize';

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
        </div>
      </div>
    </div>
  );
}
