import { getFontSizeClass } from '../utils/fontSize';
import { CheckIcon } from './icons/CheckIcon';
import { DeleteIcon } from './icons/DeleteIcon';

interface MultipleChoiceCardProps {
  prompt: string;
  options: string[];
  correctAnswer: string;
  selected: string | null;
  onSelect: (option: string) => void;
}

export function MultipleChoiceCard({
  prompt,
  options,
  correctAnswer,
  selected,
  onSelect,
}: MultipleChoiceCardProps) {
  const answered = selected !== null;

  return (
    <>
      <div className={`practice-prompt ${getFontSizeClass(prompt)}`}>{prompt}</div>
      <div className="mc-options">
        {options.map((option) => {
          const isCorrect = option === correctAnswer;
          const isWrongPick = answered && option === selected && !isCorrect;
          const stateClass = answered
            ? isCorrect
              ? 'correct'
              : isWrongPick
                ? 'wrong'
                : 'dim'
            : '';

          return (
            <button
              key={option}
              className={`mc-option ${stateClass}`}
              onClick={() => onSelect(option)}
              disabled={answered}
            >
              <span>{option}</span>
              {answered && isCorrect && (
                <span className="mc-option-icon">
                  <CheckIcon />
                </span>
              )}
              {isWrongPick && (
                <span className="mc-option-icon">
                  <DeleteIcon />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
