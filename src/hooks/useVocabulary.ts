import { useEffect, useState } from 'react';
import * as vocabularyApi from '../lib/vocabularyApi';
import type { LanguageId } from '../types/models';
import type { VocabWord } from '../types/vocabWord';

export type SyncStatus = 'synced' | 'syncing' | 'error';

const CACHE_KEY_PREFIX = 'vocabV2Cache:';

/**
 * Loads/persists vocabulary against the v2 schema (Word/Translation/
 * ExampleSentence/Deck/DeckWord, see src/lib/vocabularyApi.ts), scoped to
 * whichever language is currently selected (docs/v2-plan.md Phase 1). Word
 * assignment to a deck is now always explicit (passed in from the Add Word
 * form) -- classifyWord's German-only regex classifier is retired.
 */
export function useVocabulary(languageId: LanguageId | null) {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [families, setFamilies] = useState<Record<string, VocabWord[]>>({});
  const [familyNames, setFamilyNames] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');

  const reload = async (forLanguageId: LanguageId) => {
    try {
      setSyncStatus('syncing');
      const snapshot = await vocabularyApi.fetchVocabulary(forLanguageId);
      setWords(snapshot.words);
      setFamilies(snapshot.families);
      setFamilyNames(snapshot.familyNames);
      localStorage.setItem(`${CACHE_KEY_PREFIX}${forLanguageId}`, JSON.stringify(snapshot));
      setSyncStatus('synced');
    } catch (error) {
      console.error('Error loading vocabulary:', error);
      const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${forLanguageId}`);
      if (cached) {
        const snapshot = JSON.parse(cached);
        setWords(snapshot.words);
        setFamilies(snapshot.families);
        setFamilyNames(snapshot.familyNames);
      }
      setSyncStatus('error');
    }
  };

  useEffect(() => {
    if (!languageId) {
      setWords([]);
      setFamilies({});
      setFamilyNames([]);
      return;
    }
    reload(languageId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languageId]);

  const addWord = async (text: string, translationText: string, deckName: string): Promise<boolean> => {
    if (!languageId || !text.trim() || !translationText.trim() || !deckName.trim()) return false;

    try {
      setSyncStatus('syncing');
      await vocabularyApi.createWord(text.trim(), translationText.trim(), deckName.trim(), languageId);
      await reload(languageId);
      return true;
    } catch (error) {
      console.error('Error adding word:', error);
      setSyncStatus('error');
      alert('Failed to add word. Please try again.');
      return false;
    }
  };

  const addFamily = (name: string, existingFamilies: Record<string, VocabWord[]>): boolean => {
    const trimmedName = name.trim();
    if (!languageId || !trimmedName) return false;

    if (existingFamilies[trimmedName]) {
      alert('A family with this name already exists.');
      return false;
    }

    (async () => {
      try {
        setSyncStatus('syncing');
        await vocabularyApi.createDeck(trimmedName, languageId);
        await reload(languageId);
      } catch (error) {
        console.error('Error adding family:', error);
        setSyncStatus('error');
        alert('Failed to add family. Please try again.');
      }
    })();

    return true;
  };

  const deleteWord = async (wordId: number) => {
    if (!languageId) return;
    if (!confirm('Are you sure you want to delete this word?')) return;

    try {
      setSyncStatus('syncing');
      await vocabularyApi.deleteWord(wordId);
      await reload(languageId);
    } catch (error) {
      console.error('Error deleting word:', error);
      setSyncStatus('error');
      alert('Failed to delete word. Please try again.');
    }
  };

  const saveEditWord = async (wordId: number, text: string, translationText: string): Promise<boolean> => {
    if (!languageId || !text.trim() || !translationText.trim()) return false;

    try {
      setSyncStatus('syncing');
      await vocabularyApi.updateWord(wordId, text.trim(), translationText.trim());
      await reload(languageId);
      return true;
    } catch (error) {
      console.error('Error updating word:', error);
      setSyncStatus('error');
      alert('Failed to update word. Please try again.');
      return false;
    }
  };

  const moveToFamily = async (wordId: number, newFamily: string) => {
    if (!languageId) return;
    try {
      setSyncStatus('syncing');
      await vocabularyApi.moveWordToDeck(wordId, newFamily, languageId);
      await reload(languageId);
    } catch (error) {
      console.error('Error moving word to family:', error);
      setSyncStatus('error');
      alert('Failed to move word. Please try again.');
    }
  };

  const saveFamilyName = async (oldName: string, newName: string): Promise<string | null> => {
    const trimmed = newName.trim();
    if (!languageId || !trimmed || trimmed === oldName) return null;

    try {
      setSyncStatus('syncing');
      await vocabularyApi.renameDeck(oldName, trimmed, languageId);
      await reload(languageId);
      return trimmed;
    } catch (error) {
      console.error('Error renaming family:', error);
      setSyncStatus('error');
      alert('Failed to rename family. Please try again.');
      return null;
    }
  };

  const deleteFamily = async (familyName: string): Promise<boolean> => {
    if (!languageId) return false;
    const wordsInFamily = families[familyName]?.length ?? 0;
    const confirmed = window.confirm(
      `Delete "${familyName}"?\n\nThis will permanently delete ${wordsInFamily} word${
        wordsInFamily === 1 ? '' : 's'
      }.\n\nThis action cannot be undone.`
    );

    if (!confirmed) return false;

    try {
      setSyncStatus('syncing');
      await vocabularyApi.deleteDeckAndWords(familyName, languageId);
      await reload(languageId);
      return true;
    } catch (error) {
      console.error('Error deleting family:', error);
      setSyncStatus('error');
      alert('Failed to delete family. Please try again.');
      return false;
    }
  };

  return {
    words,
    families,
    familyNames,
    syncStatus,
    addWord,
    addFamily,
    deleteWord,
    saveEditWord,
    moveToFamily,
    saveFamilyName,
    deleteFamily,
  };
}
