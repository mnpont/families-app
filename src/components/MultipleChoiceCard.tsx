import { useRef } from 'react';
import { useFitText } from '../hooks/useFitText';
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
  const promptRef = useRef<HTMLDivElement>(null);
  const { fontSize, overflowing } = useFitText(promptRef, prompt, {
    maxFontSize: 40,
    minFontSize: 18,
  });

  return (
    <>
      {/* Fixed-height slot: the options below sit at the same y for a one-word
          prompt and a two-line one, so moving to the next question never
          shifts them. */}
      <div className="practice-prompt-slot">
        <div
          ref={promptRef}
          className={`practice-prompt ${overflowing ? 'practice-prompt--overflowing' : ''}`}
          style={{ fontSize }}
        >
          {prompt}
        </div>
      </div>
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
