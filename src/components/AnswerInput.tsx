import { forwardRef, useEffect, useRef } from 'react';
import { CheckIcon } from './icons/CheckIcon';
import { DeleteIcon } from './icons/DeleteIcon';

export type AnswerInputState = 'idle' | 'correct' | 'almost' | 'wrong';

interface AnswerInputProps {
  prefix?: string;
  value: string;
  state: AnswerInputState;
  lang: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

/**
 * The typed-answer field (screens 3a-4c), with its fixed pronoun prefix.
 * 'idle' is editable (focus styling comes from :focus-within); any graded
 * state is read-only and colored. No accent buttons, by design: typing the
 * accent is part of the retrieval being practised, and "almost" grading
 * already forgives a missed one.
 *
 * Deliberately NOT remounted between questions -- the same element is
 * refocused inside the Next tap's own event handler (see
 * ConjugationDrillView), which is what lets iOS Safari reopen the keyboard.
 * A freshly mounted input focused later would not.
 */
export const AnswerInput = forwardRef<HTMLInputElement, AnswerInputProps>(function AnswerInput(
  { prefix, value, state, lang, placeholder = 'Type the verb form…', onChange },
  ref,
) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const locked = state !== 'idle';

  // Safety net only: the prompt + input sit in the top ~270px of content, so
  // the iOS keyboard shouldn't cover them. If a small screen or a large
  // text size makes it happen anyway, scroll the field back into view.
  useEffect(() => {
    const viewport = window.visualViewport;
    const wrapper = wrapperRef.current;
    if (!viewport || !wrapper) return;
    const keepVisible = () => {
      if (!wrapper.contains(document.activeElement)) return;
      const { bottom } = wrapper.getBoundingClientRect();
      if (bottom > viewport.offsetTop + viewport.height - 8) {
        wrapper.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    };
    viewport.addEventListener('resize', keepVisible);
    return () => viewport.removeEventListener('resize', keepVisible);
  }, []);

  return (
    <div ref={wrapperRef} className={`conj-answer-input conj-answer-input--${state}`}>
      {prefix && <span className="conj-answer-prefix">{prefix}</span>}
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={locked}
        placeholder={placeholder}
        enterKeyHint="go"
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        lang={lang}
        aria-label="Your answer"
      />
      {state === 'correct' && (
        <span className="conj-answer-icon conj-answer-icon--correct">
          <CheckIcon />
        </span>
      )}
      {state === 'wrong' && (
        <span className="conj-answer-icon conj-answer-icon--wrong">
          <DeleteIcon />
        </span>
      )}
    </div>
  );
});
