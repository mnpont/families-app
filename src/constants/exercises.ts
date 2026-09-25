import type { LanguageId } from '../types/models';
import { CONJUGATION_LANGUAGES } from './conjugation';

/**
 * The Practice hub's exercise registry (docs/practice-hub-spec.md "Adding
 * an exercise"). The hub renders this list in order; each entry's status is
 * resolved per language. Enabling Fill the Gap or Build the Sentence later
 * is changing its `status` line here plus adding its component in
 * PracticeView -- nothing else reads this list.
 */

export type ExerciseId = 'multipleChoice' | 'conjugationDrill' | 'fillTheGap' | 'buildTheSentence';

export type ExerciseStatus = 'enabled' | 'comingSoon' | 'languageLimited';

/** Which tile icon ExerciseMenuButton draws. */
export type ExerciseIcon = 'aa' | 'je' | 'gap' | 'chips';

export interface ExerciseDefinition {
  id: ExerciseId;
  name: string;
  description: string;
  icon: ExerciseIcon;
  status: (languageId: LanguageId | null) => ExerciseStatus;
  /** Tag text when languageLimited. */
  languageLimitedLabel?: string;
}

export const EXERCISES: ExerciseDefinition[] = [
  {
    id: 'multipleChoice',
    name: 'Multiple Choice',
    description: 'Pick the right translation',
    icon: 'aa',
    status: () => 'enabled',
  },
  {
    id: 'conjugationDrill',
    name: 'Conjugation Drill',
    description: 'Type the right verb form',
    icon: 'je',
    status: (languageId) =>
      languageId && CONJUGATION_LANGUAGES.includes(languageId) ? 'enabled' : 'languageLimited',
    languageLimitedLabel: 'French only for now',
  },
  {
    id: 'fillTheGap',
    name: 'Fill the Gap',
    description: 'Complete the sentence with the right verb',
    icon: 'gap',
    status: () => 'comingSoon',
  },
  {
    id: 'buildTheSentence',
    name: 'Build the Sentence',
    description: 'Put the words in order',
    icon: 'chips',
    status: () => 'comingSoon',
  },
];
