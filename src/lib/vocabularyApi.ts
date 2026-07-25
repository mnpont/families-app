import { supabase } from './supabaseClient';
import { OWNER_ID } from '../constants/owner';
import { detectTranslationLanguage } from '../utils/detectTranslationLanguage';
import type { LegacyWord } from '../types/legacyWord';

const LANGUAGE_ID = 'de';

/**
 * Data-access layer for the v2 schema (migrations/001-006). Reads/writes
 * Word/Translation/ExampleSentence/Deck/DeckWord rows but still exposes the
 * legacy LegacyWord shape to the rest of the app -- the UI is still
 * German-only and unchanged (docs/v2-plan.md Phase 1 is what generalizes
 * it), only the storage underneath moved.
 *
 * A word is treated as belonging to exactly one deck, matching the legacy
 * `family` column's 1:1 assumption, even though deck_words is a many-to-many
 * join table by design (future decks/multi-language work can relax this;
 * nothing here prevents it).
 */

interface WordRow {
  id: number;
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
  words: LegacyWord[];
  families: Record<string, LegacyWord[]>;
  familyNames: string[];
}

function primaryTranslation(word: WordRow) {
  return word.translations.find((t) => t.is_primary) ?? word.translations[0];
}

function toLegacyWord(word: WordRow, familyName: string): LegacyWord {
  const translation = primaryTranslation(word);
  const example = word.example_sentences[0];
  return {
    id: word.id,
    german: word.text,
    english: translation?.text ?? '',
    family: familyName,
    dateAdded: word.created_at,
    exampleSentenceDe: example?.text ?? null,
    exampleSentenceEn: example?.translation_text ?? null,
  };
}

export async function fetchVocabulary(): Promise<VocabularySnapshot> {
  const [{ data: words, error: wordsError }, { data: decks, error: decksError }] = await Promise.all([
    supabase
      .from('words')
      .select('id, text, created_at, translations(id, text, language_id, is_primary), example_sentences(id, text, translation_text)')
      .eq('language_id', LANGUAGE_ID)
      .order('created_at', { ascending: true }),
    supabase
      .from('decks')
      .select('id, name, deck_words(word_id)')
      .eq('owner_id', OWNER_ID)
      .eq('language_id', LANGUAGE_ID)
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

  const families: Record<string, LegacyWord[]> = {};
  for (const deck of deckRows) {
    families[deck.name] = deck.deck_words
      .map(({ word_id }) => wordsById.get(word_id))
      .filter((w): w is WordRow => w !== undefined)
      .map((w) => toLegacyWord(w, deck.name));
  }

  const allWords = wordRows.map((w) => toLegacyWord(w, deckNameByWordId.get(w.id) ?? ''));

  return {
    words: allWords,
    families,
    familyNames: deckRows.map((d) => d.name),
  };
}

async function findOrCreateDeck(name: string): Promise<number> {
  const { data: existing, error: selectError } = await supabase
    .from('decks')
    .select('id')
    .eq('owner_id', OWNER_ID)
    .eq('language_id', LANGUAGE_ID)
    .eq('name', name)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data: inserted, error: insertError } = await supabase
    .from('decks')
    .insert({ name, language_id: LANGUAGE_ID, owner_id: OWNER_ID })
    .select('id')
    .single();
  if (insertError) throw insertError;
  return inserted.id;
}

export async function createWord(german: string, english: string, family: string): Promise<LegacyWord> {
  const createdAt = new Date().toISOString();

  const { data: word, error: wordError } = await supabase
    .from('words')
    .insert({ language_id: LANGUAGE_ID, text: german, created_at: createdAt })
    .select('id, text, created_at')
    .single();
  if (wordError) throw wordError;

  const translationLanguage = detectTranslationLanguage(german, english);
  const { error: translationError } = await supabase
    .from('translations')
    .insert({ word_id: word.id, language_id: translationLanguage, text: english, is_primary: true });
  if (translationError) throw translationError;

  const deckId = await findOrCreateDeck(family);
  const { error: linkError } = await supabase
    .from('deck_words')
    .insert({ deck_id: deckId, word_id: word.id, added_at: createdAt });
  if (linkError) throw linkError;

  return {
    id: word.id,
    german: word.text,
    english,
    family,
    dateAdded: word.created_at,
  };
}

export async function createDeck(name: string): Promise<void> {
  const { error } = await supabase.from('decks').insert({ name, language_id: LANGUAGE_ID, owner_id: OWNER_ID });
  if (error) throw error;
}

export async function deleteWord(wordId: number): Promise<void> {
  // Cascades to translations/example_sentences/deck_words via FK.
  const { error } = await supabase.from('words').delete().eq('id', wordId);
  if (error) throw error;
}

export async function updateWord(wordId: number, german: string, english: string): Promise<void> {
  const { error: wordError } = await supabase.from('words').update({ text: german }).eq('id', wordId);
  if (wordError) throw wordError;

  const { error: translationError } = await supabase
    .from('translations')
    .update({ text: english })
    .eq('word_id', wordId)
    .eq('is_primary', true);
  if (translationError) throw translationError;
}

export async function moveWordToDeck(wordId: number, newFamilyName: string): Promise<void> {
  const deckId = await findOrCreateDeck(newFamilyName);

  const { error: deleteError } = await supabase.from('deck_words').delete().eq('word_id', wordId);
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase
    .from('deck_words')
    .insert({ deck_id: deckId, word_id: wordId, added_at: new Date().toISOString() });
  if (insertError) throw insertError;
}

export async function renameDeck(oldName: string, newName: string): Promise<void> {
  const { error } = await supabase
    .from('decks')
    .update({ name: newName })
    .eq('owner_id', OWNER_ID)
    .eq('language_id', LANGUAGE_ID)
    .eq('name', oldName);
  if (error) throw error;
}

/** Deletes a deck and every word exclusively linked to it, matching the legacy "delete family deletes its words" behavior. */
export async function deleteDeckAndWords(name: string): Promise<void> {
  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('id, deck_words(word_id)')
    .eq('owner_id', OWNER_ID)
    .eq('language_id', LANGUAGE_ID)
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
