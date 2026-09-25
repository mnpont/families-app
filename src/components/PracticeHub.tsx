import { EXERCISES, type ExerciseId } from '../constants/exercises';
import type { LanguageId } from '../types/models';
import { ExerciseMenuButton } from './ExerciseMenuButton';

interface PracticeHubProps {
  languageId: LanguageId | null;
  /** Cards Multiple Choice would serve now; null while unknown. */
  dueCount: number | null;
  /** Verbs in the drill pool; null while loading or when the language has no drill. */
  verbCount: number | null;
  onSelect: (id: ExerciseId) => void;
}

/**
 * The Practice tab's default screen (1a/1b): the exercise registry
 * (src/constants/exercises.ts) as a list, in order, statuses resolved for
 * the selected language.
 */
export function PracticeHub({ languageId, dueCount, verbCount, onSelect }: PracticeHubProps) {
  const countFor = (id: ExerciseId) => {
    if (id === 'multipleChoice' && dueCount) {
      return { label: `${dueCount} due`, tone: 'accent' as const };
    }
    if (id === 'conjugationDrill' && verbCount) {
      return { label: `${verbCount} verb${verbCount === 1 ? '' : 's'}`, tone: 'muted' as const };
    }
    return undefined;
  };

  return (
    <div className="exercise-list">
      {EXERCISES.map((exercise) => {
        const status = exercise.status(languageId);
        return (
          <ExerciseMenuButton
            key={exercise.id}
            name={exercise.name}
            description={exercise.description}
            icon={exercise.icon}
            status={status}
            tag={status === 'languageLimited' ? exercise.languageLimitedLabel : 'Coming soon'}
            count={countFor(exercise.id)}
            onClick={() => onSelect(exercise.id)}
          />
        );
      })}
    </div>
  );
}
