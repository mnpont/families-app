import type { Grade } from '../types/models';

const GRADE_BUTTONS: {
  grade: Grade;
  label: string;
  variant: 'button-secondary' | 'button-primary';
}[] = [
  { grade: 'again', label: 'Again', variant: 'button-secondary' },
  { grade: 'hard', label: 'Hard', variant: 'button-secondary' },
  { grade: 'good', label: 'Good', variant: 'button-primary' },
  { grade: 'easy', label: 'Easy', variant: 'button-primary' },
];

interface GradeButtonsProps {
  onGrade: (grade: Grade) => void;
  disabled?: boolean;
}

/** The Again/Hard/Good/Easy confidence-rating row, shared by every review mode (flashcards, practice, ...). */
export function GradeButtons({ onGrade, disabled }: GradeButtonsProps) {
  return (
    <>
      {GRADE_BUTTONS.map(({ grade, label, variant }) => (
        <button
          key={grade}
          className={`button ${variant}`}
          onClick={() => onGrade(grade)}
          disabled={disabled}
        >
          {label}
        </button>
      ))}
    </>
  );
}
