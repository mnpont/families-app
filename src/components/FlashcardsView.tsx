import { useState } from 'react';
import { useReviewSession } from '../hooks/useReviewSession';
import type { Grade, LanguageId } from '../types/models';
import type { ReviewCard } from '../types/reviewCard';
import { Flashcard } from './Flashcard';
import { GradeButtons } from './GradeButtons';

interface FlashcardsViewProps {
  languageId: LanguageId | null;
}

/** Local, purely-presentational stage of the post-grade "sent to the back of the deck" motion. */
type DeckPhase = 'idle' | 'left' | 'back';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function FlashcardsView({ languageId }: FlashcardsViewProps) {
  const { cards, loading, submitting, submitGrade } = useReviewSession(languageId);
  const [isFlipped, setIsFlipped] = useState(false);
  const [deckPhase, setDeckPhase] = useState<DeckPhase>('idle');
  const [isAnimating, setIsAnimating] = useState(false);
  const [frozenCard, setFrozenCard] = useState<ReviewCard | null>(null);

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
  // While animating, keep showing the card being graded -- cards[0] may
  // already have advanced to the next word once submitGrade resolves.
  const displayedCard = frozenCard ?? currentCard;

  const handleGrade = async (grade: Grade) => {
    if (submitting || isAnimating) return;
    setIsAnimating(true);
    setFrozenCard(currentCard);
    setIsFlipped(false);
    const gradePromise = submitGrade(currentCard.id, grade);
    await wait(600);
    setDeckPhase('left');
    await wait(240);
    setDeckPhase('back');
    await Promise.all([wait(320), gradePromise]);
    setDeckPhase('idle');
    setFrozenCard(null);
    setIsAnimating(false);
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

        <Flashcard
          word={displayedCard}
          className={`flashcard top ${deckPhase !== 'idle' ? `deck-${deckPhase}` : ''}`}
          isFlipped={isFlipped}
          onClick={() => !isAnimating && setIsFlipped((flipped) => !flipped)}
        />
      </div>

      {/* Always in the DOM so grading never shifts anything above it -- only opacity/position change. */}
      <div className={`flashcard-nav ${!isFlipped ? 'flashcard-nav--pending' : ''}`}>
        <GradeButtons onGrade={handleGrade} disabled={submitting || isAnimating} />
      </div>
    </div>
  );
}
