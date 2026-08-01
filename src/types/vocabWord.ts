import type { LanguageId } from './models';

/**
 * A Word joined with its primary Translation/ExampleSentence and deck name --
 * the shape the UI renders. Replaces LegacyWord's fixed german/english/
 * exampleSentenceDe/exampleSentenceEn fields (src/types/legacyWord.ts) with
 * generic, language-tagged nesting per docs/v2-plan.md Section 1.
 */
export interface VocabWord {
  id: number;
  languageId: LanguageId;
  text: string;
  translation: { text: string } | null;
  exampleSentence: { text: string; translationText: string | null } | null;
  deckName: string;
  createdAt: string;
}
