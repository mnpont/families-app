interface ConjugationPromptProps {
  tenseLabel: string;
  pronoun: string;
  infinitive: string;
  meaning: string | null;
}

/**
 * The drill's fixed-height prompt slot (screen 3a): tense pill, pronoun +
 * infinitive, meaning. The slot's min-height keeps the answer row in the
 * same place for every question and through feedback.
 */
export function ConjugationPrompt({
  tenseLabel,
  pronoun,
  infinitive,
  meaning,
}: ConjugationPromptProps) {
  return (
    <div className="conj-prompt">
      <span className="conj-tense-pill">{tenseLabel}</span>
      <div className="conj-prompt-row">
        <span className="conj-prompt-pronoun">{pronoun}</span>
        <span className="conj-prompt-infinitive">{infinitive}</span>
      </div>
      {meaning && <div className="conj-prompt-meaning">{meaning}</div>}
    </div>
  );
}
