import { FamiliesIcon } from './icons/FamiliesIcon';
import { FlashcardsIcon } from './icons/FlashcardsIcon';
import { PracticeIcon } from './icons/PracticeIcon';
import type { View } from '../App';

interface NavBarProps {
  view: View;
  onViewChange: (view: View) => void;
}

export function NavBar({ view, onViewChange }: NavBarProps) {
  return (
    <div className="nav-bar">
      <button
        className={`nav-button ${view === 'families' ? 'active' : ''}`}
        onClick={() => onViewChange('families')}
      >
        <FamiliesIcon />
      </button>
      <button
        className={`nav-button ${view === 'flashcards' ? 'active' : ''}`}
        onClick={() => onViewChange('flashcards')}
      >
        <FlashcardsIcon />
      </button>
      <button
        className={`nav-button ${view === 'practice' ? 'active' : ''}`}
        onClick={() => onViewChange('practice')}
      >
        <PracticeIcon />
      </button>
    </div>
  );
}
