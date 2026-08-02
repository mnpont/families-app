import { supabase } from './supabaseClient';
import { OWNER_ID } from '../constants/owner';
import { detectTranslationLanguage } from '../utils/detectTranslationLanguage';
import { defaultScheduleState, type ScheduleResult } from '../utils/scheduler';
import type { Grade, Language, LanguageId } from '../types/models';
import type { VocabWord } from '../types/vocabWord';
import type { ReviewCard } from '../types/reviewCard';

/**
 * Data-access layer for the v2 schema (migrations/001-007). Every query is
 * scoped by a `languageId` argument supplied by the caller (driven by the
 * language selector, see src/hooks/useLanguages.ts) rather than a hardcoded
 * constant -- this is what lets any row added to `languages` work end-to-end
 * with zero code changes (docs/v2-plan.md Phase 1).
 */

interface WordRow {
  id: number;
  language_id: string;
  text: string;
  created_at: string;
  translations: { id: number; text: string; language_id: string; is_primary: boolean }[];
  example_sentences: { id: number; text: string; translation_text: string | null }[];
}

interface DeckRow {
  id: number;
  name: string;
  deck_words: { word_id: number }[];
}

export interface VocabularySnapshot {
  words: VocabWord[];
  families: Record<string, VocabWord[]>;
  familyNames: string[];
}

function primaryTranslation(word: WordRow) {
  return word.translations.find((t) => t.is_primary) ?? word.translations[0];
}

function toVocabWord(word: WordRow, deckName: string): VocabWord {
  const translation = primaryTranslation(word);
  const example = word.example_sentences[0];
  return {
    id: word.id,
    languageId: word.language_id,
    text: word.text,
    translation: translation ? { text: translation.text } : null,
    exampleSentence: example ? { text: example.text, translationText: example.translation_text } : null,
    deckName,
    createdAt: word.created_at,
  };
}

export async function fetchLanguages(): Promise<Language[]> {
  const { data, error } = await supabase.from('languages').select('id, name').order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchVocabulary(languageId: LanguageId): Promise<VocabularySnapshot> {
  const [{ data: words, error: wordsError }, { data: decks, error: decksError }] = await Promise.all([
    supabase
      .from('words')
      .select('id, language_id, text, created_at, translations(id, text, language_id, is_primary), example_sentences(id, text, translation_text)')
      .eq('language_id', languageId)
      .order('created_at', { ascending: true }),
    supabase
      .from('decks')
      .select('id, name, deck_words(word_id)')
      .eq('owner_id', OWNER_ID)
      .eq('language_id', languageId)
      .order('name', { ascending: true }),
  ]);

  if (wordsError) throw wordsError;
  if (decksError) throw decksError;

  const wordRows = (words ?? []) as unknown as WordRow[];
  const deckRows = (decks ?? []) as unknown as DeckRow[];

  const wordsById = new Map(wordRows.map((w) => [w.id, w]));
  const deckNameByWordId = new Map<number, string>();
  for (const deck of deckRows) {
    for (const { word_id } of deck.deck_words) {
      deckNameByWordId.set(word_id, deck.name);
    }
  }

  const families: Record<string, VocabWord[]> = {};
  for (const deck of deckRows) {
    families[deck.name] = deck.deck_words
      .map(({ word_id }) => wordsById.get(word_id))
      .filter((w): w is WordRow => w !== undefined)
      .map((w) => toVocabWord(w, deck.name));
  }

  const allWords = wordRows.map((w) => toVocabWord(w, deckNameByWordId.get(w.id) ?? ''));

  return {
    words: allWords,
    families,
    familyNames: deckRows.map((d) => d.name),
  };
}

async function findOrCreateDeck(name: string, languageId: LanguageId): Promise<number> {
  const { data: existing, error: selectError } = await supabase
    .from('decks')
    .select('id')
    .eq('owner_id', OWNER_ID)
    .eq('language_id', languageId)
    .eq('name', name)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data: inserted, error: insertError } = await supabase
    .from('decks')
    .insert({ name, language_id: languageId, owner_id: OWNER_ID })
    .select('id')
    .single();
  if (insertError) throw insertError;
  return inserted.id;
}

export async function createWord(
  text: string,
  translationText: string,
  deckName: string,
  languageId: LanguageId
): Promise<VocabWord> {
  const createdAt = new Date().toISOString();

  const { data: word, error: wordError } = await supabase
    .from('words')
    .insert({ language_id: languageId, text, created_at: createdAt })
    .select('id, text, created_at')
    .single();
  if (wordError) throw wordError;

  const translationLanguage = detectTranslationLanguage(text, translationText);
  const { error: translationError } = await supabase
    .from('translations')
    .insert({ word_id: word.id, language_id: translationLanguage, text: translationText, is_primary: true });
  if (translationError) throw translationError;

  const deckId = await findOrCreateDeck(deckName, languageId);
  const { error: linkError } = await supabase
    .from('deck_words')
    .insert({ deck_id: deckId, word_id: word.id, added_at: createdAt });
  if (linkError) throw linkError;

  // Every Word gets a schedule row at creation time so it enters the review
  // queue immediately (due_at = now), regardless of which path created it.
  const defaults = defaultScheduleState();
  const { error: scheduleError } = await supabase.from('word_schedule_state').insert({
    word_id: word.id,
    user_id: OWNER_ID,
    interval_days: defaults.intervalDays,
    ease_factor: defaults.easeFactor,
    due_at: createdAt,
    review_count: defaults.reviewCount,
  });
  if (scheduleError) throw scheduleError;

  return {
    id: word.id,
    languageId,
    text: word.text,
    translation: { text: translationText },
    exampleSentence: null,
    deckName,
    createdAt: word.created_at,
  };
}

export async function createDeck(name: string, languageId: LanguageId): Promise<void> {
  const { error } = await supabase.from('decks').insert({ name, language_id: languageId, owner_id: OWNER_ID });
  if (error) throw error;
}

export async function deleteWord(wordId: number): Promise<void> {
  // Cascades to translations/example_sentences/deck_words via FK.
  const { error } = await supabase.from('words').delete().eq('id', wordId);
  if (error) throw error;
}

export async function updateWord(wordId: number, text: string, translationText: string): Promise<void> {
  const { error: wordError } = await supabase.from('words').update({ text }).eq('id', wordId);
  if (wordError) throw wordError;

  const { error: translationError } = await supabase
    .from('translations')
    .update({ text: translationText })
    .eq('word_id', wordId)
    .eq('is_primary', true);
  if (translationError) throw translationError;
}

export async function moveWordToDeck(wordId: number, newDeckName: string, languageId: LanguageId): Promise<void> {
  const deckId = await findOrCreateDeck(newDeckName, languageId);

  const { error: deleteError } = await supabase.from('deck_words').delete().eq('word_id', wordId);
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase
    .from('deck_words')
    .insert({ deck_id: deckId, word_id: wordId, added_at: new Date().toISOString() });
  if (insertError) throw insertError;
}

export async function renameDeck(oldName: string, newName: string, languageId: LanguageId): Promise<void> {
  const { error } = await supabase
    .from('decks')
    .update({ name: newName })
    .eq('owner_id', OWNER_ID)
    .eq('language_id', languageId)
    .eq('name', oldName);
  if (error) throw error;
}

/** Deletes a deck and every word exclusively linked to it, matching the legacy "delete family deletes its words" behavior. */
export async function deleteDeckAndWords(name: string, languageId: LanguageId): Promise<void> {
  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('id, deck_words(word_id)')
    .eq('owner_id', OWNER_ID)
    .eq('language_id', languageId)
    .eq('name', name)
    .single();
  if (deckError) throw deckError;

  const wordIds = ((deck as unknown as DeckRow).deck_words ?? []).map((dw) => dw.word_id);
  if (wordIds.length > 0) {
    const { error: deleteWordsError } = await supabase.from('words').delete().in('id', wordIds);
    if (deleteWordsError) throw deleteWordsError;
  }

  const { error: deleteDeckError } = await supabase.from('decks').delete().eq('id', deck.id);
  if (deleteDeckError) throw deleteDeckError;
}

/** How many never-before-reviewed words a single review session introduces, on top of however many are already due. */
const NEW_WORD_CAP = 10;

interface ScheduleRow {
  interval_days: number;
  ease_factor: number;
  review_count: number;
  due_at: string;
  words: WordRow;
}

const REVIEW_CARD_SELECT =
  'interval_days, ease_factor, review_count, due_at, words!inner(id, language_id, text, created_at, translations(id, text, language_id, is_primary), example_sentences(id, text, translation_text))';

function toReviewCard(row: ScheduleRow): ReviewCard {
  return {
    // Deck membership isn't queried here -- it's irrelevant to review and
    // would need an extra join through deck_words/decks that nothing in
    // the review UI renders.
    ...toVocabWord(row.words, ''),
    schedule: { intervalDays: row.interval_days, easeFactor: row.ease_factor, reviewCount: row.review_count },
  };
}

/**
 * A review session's card batch: every word already due for repeat review
 * (review_count > 0, due_at <= now), plus up to `newWordCap` words that have
 * never been reviewed yet (review_count === 0) -- not a shuffle of the
 * entire deck (docs/v2-plan.md Phase 1 Step 2).
 *
 * Note: a lapsed card (graded "again") resets review_count to 0, same as
 * textbook SM-2's repetition count -- so right after a lapse it temporarily
 * shares the new-word cap bucket with words that have truly never been
 * reviewed, rather than getting its own "relearning" queue. That's a
 * deliberate simplification for this step; a dedicated relearning queue is
 * future work if the new-word cap turns out to starve lapsed cards in
 * practice.
 */
export async function fetchReviewSession(
  languageId: LanguageId,
  now: Date = new Date(),
  newWordCap: number = NEW_WORD_CAP
): Promise<ReviewCard[]> {
  const nowIso = now.toISOString();

  const [{ data: due, error: dueError }, { data: fresh, error: freshError }] = await Promise.all([
    supabase
      .from('word_schedule_state')
      .select(REVIEW_CARD_SELECT)
      .eq('user_id', OWNER_ID)
      .eq('words.language_id', languageId)
      .gt('review_count', 0)
      .lte('due_at', nowIso)
      .order('due_at', { ascending: true }),
    supabase
      .from('word_schedule_state')
      .select(REVIEW_CARD_SELECT)
      .eq('user_id', OWNER_ID)
      .eq('words.language_id', languageId)
      .eq('review_count', 0)
      .lte('due_at', nowIso)
      .order('due_at', { ascending: true })
      .limit(newWordCap),
  ]);

  if (dueError) throw dueError;
  if (freshError) throw freshError;

  const dueRows = (due ?? []) as unknown as ScheduleRow[];
  const freshRows = (fresh ?? []) as unknown as ScheduleRow[];

  return [...dueRows, ...freshRows].map(toReviewCard);
}

/** Records a graded review: appends to the ReviewLog history and writes the scheduler's output as the word's new live state. */
export async function submitReview(wordId: number, grade: Grade, next: ScheduleResult, now: Date = new Date()): Promise<void> {
  const { error: logError } = await supabase
    .from('review_log')
    .insert({ word_id: wordId, user_id: OWNER_ID, reviewed_at: now.toISOString(), grade, mode: 'recognition' });
  if (logError) throw logError;

  const { error: stateError } = await supabase
    .from('word_schedule_state')
    .update({
      interval_days: next.intervalDays,
      ease_factor: next.easeFactor,
      due_at: next.dueAt.toISOString(),
      review_count: next.reviewCount,
    })
    .eq('word_id', wordId)
    .eq('user_id', OWNER_ID);
  if (stateError) throw stateError;
}
