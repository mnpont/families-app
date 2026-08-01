import type { LegacyWord } from '../types/legacyWord';
import { getFontSizeClass } from '../utils/fontSize';

interface FlashcardProps {
  word: LegacyWord | undefined;
  className: string;
  isFlipped?: boolean;
  onClick?: () => void;
}

export function Flashcard({ word, className, isFlipped, onClick }: FlashcardProps) {
  return (
    <div className={className} onClick={onClick}>
      <div className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`}>
        <div className="flashcard-face flashcard-front">
          <div className={`flashcard-text ${getFontSizeClass(word?.german)}`}>{word?.german}</div>
        </div>
        <div className="flashcard-face flashcard-back">
          <div className={`flashcard-text ${getFontSizeClass(word?.english)}`}>{word?.english}</div>
        </div>
      </div>
    </div>
  );
}
