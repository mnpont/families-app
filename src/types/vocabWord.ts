import type { Gender, LanguageId } from './models';

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
  partOfSpeech: string | null;
  gender: Gender | null;
  translation: { text: string } | null;
  exampleSentence: { text: string; translationText: string | null } | null;
  /** Up to 3 LLM-generated plausible-but-wrong translations for Practice-tab multiple choice, or null if not (yet) generated. */
  llmDistractors: string[] | null;
  deckName: string;
  createdAt: string;
}
