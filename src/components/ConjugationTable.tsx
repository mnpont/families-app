import type { ConjugationLanguageConfig } from '../constants/conjugation';
import type { Conjugations, Person } from '../types/conjugations';
import { formsFor } from '../utils/conjugationForms';

interface ConjugationTableProps {
  config: ConjugationLanguageConfig;
  conjugations: Conjugations;
  tense: string;
  /** The person the drill asked for, tinted. */
  highlightPerson?: Person;
}

/**
 * One tense of a verb as a 2-column table, singular | plural (je|nous,
 * tu|vous, ...), the way French textbooks lay it out. Shows each cell's
 * canonical form; a person the verb doesn't have (impersonal "il faut")
 * leaves its cell empty, and a row with neither is dropped.
 */
export function ConjugationTable({
  config,
  conjugations,
  tense,
  highlightPerson,
}: ConjugationTableProps) {
  const cell = (personKey: Person) => {
    const person = config.persons.find((p) => p.key === personKey);
    const form = formsFor(conjugations, tense, personKey)[0];
    if (!person || !form) return <div key={personKey} />;
    return (
      <div
        key={personKey}
        className={`conj-table-cell ${personKey === highlightPerson ? 'conj-table-cell--highlight' : ''}`}
      >
        <div className="conj-table-pronoun">{config.pronounLabel(person, form, conjugations)}</div>
        <div className="conj-table-form">{form}</div>
      </div>
    );
  };

  return (
    <div className="conj-table">
      {config.tableRows
        .filter((row) => row.some((p) => formsFor(conjugations, tense, p).length > 0))
        .flatMap((row) => row.map(cell))}
    </div>
  );
}
