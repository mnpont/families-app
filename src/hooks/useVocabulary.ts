import { useEffect, useState } from 'react';
import { classifyWord } from '../utils/classifyWord';
import * as vocabularyApi from '../lib/vocabularyApi';
import type { LegacyWord } from '../types/legacyWord';

export type SyncStatus = 'synced' | 'syncing' | 'error';

const CACHE_KEY = 'vocabV2Cache';

/**
 * Loads/persists vocabulary against the v2 schema (Word/Translation/
 * ExampleSentence/Deck/DeckWord, see src/lib/vocabularyApi.ts), replacing
 * the legacy `words`-table-backed version of this hook. The public shape
 * (LegacyWord[], families map) and all behavior are unchanged -- still
 * German-only, still classifyWord-based deck assignment -- only the
 * storage moved.
 *
 * No more `emptyFamilies` localStorage special-casing (removed per Phase 0
 * Step 2 item 8): a Deck row with no words IS an empty family now, so it
 * doesn't need separate client-side tracking. No more bundled
 * preLoadedWords seeding either -- that was a one-time legacy bootstrap;
 * the v2 tables are seeded once via scripts/backfillToV2Schema.ts.
 */
export function useVocabulary() {
  const [words, setWords] = useState<LegacyWord[]>([]);
  const [families, setFamilies] = useState<Record<string, LegacyWord[]>>({});
  const [familyNames, setFamilyNames] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');

  const reload = async () => {
    try {
      setSyncStatus('syncing');
      const snapshot = await vocabularyApi.fetchVocabulary();
      setWords(snapshot.words);
      setFamilies(snapshot.families);
      setFamilyNames(snapshot.familyNames);
      localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
      setSyncStatus('synced');
    } catch (error) {
      console.error('Error loading vocabulary:', error);
      const cached = localStorage.getItem(CACHE_KEY);
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
    reload();
  }, []);

  const addWord = async (germanWord: string, englishWord: string): Promise<boolean> => {
    if (!germanWord.trim() || !englishWord.trim()) return false;

    try {
      setSyncStatus('syncing');
      const family = classifyWord(germanWord, englishWord);
      await vocabularyApi.createWord(germanWord.trim(), englishWord.trim(), family);
      await reload();
      return true;
    } catch (error) {
      console.error('Error adding word:', error);
      setSyncStatus('error');
      alert('Failed to add word. Please try again.');
      return false;
    }
  };

  const addFamily = (name: string, existingFamilies: Record<string, LegacyWord[]>): boolean => {
    const trimmedName = name.trim();
    if (!trimmedName) return false;

    if (existingFamilies[trimmedName]) {
      alert('A family with this name already exists.');
      return false;
    }

    (async () => {
      try {
        setSyncStatus('syncing');
        await vocabularyApi.createDeck(trimmedName);
        await reload();
      } catch (error) {
        console.error('Error adding family:', error);
        setSyncStatus('error');
        alert('Failed to add family. Please try again.');
      }
    })();

    return true;
  };

  const deleteWord = async (wordId: number) => {
    if (!confirm('Are you sure you want to delete this word?')) return;

    try {
      setSyncStatus('syncing');
      await vocabularyApi.deleteWord(wordId);
      await reload();
    } catch (error) {
      console.error('Error deleting word:', error);
      setSyncStatus('error');
      alert('Failed to delete word. Please try again.');
    }
  };

  const saveEditWord = async (wordId: number, german: string, english: string): Promise<boolean> => {
    if (!german.trim() || !english.trim()) return false;

    try {
      setSyncStatus('syncing');
      await vocabularyApi.updateWord(wordId, german.trim(), english.trim());
      await reload();
      return true;
    } catch (error) {
      console.error('Error updating word:', error);
      setSyncStatus('error');
      alert('Failed to update word. Please try again.');
      return false;
    }
  };

  const moveToFamily = async (wordId: number, newFamily: string) => {
    try {
      setSyncStatus('syncing');
      await vocabularyApi.moveWordToDeck(wordId, newFamily);
      await reload();
    } catch (error) {
      console.error('Error moving word to family:', error);
      setSyncStatus('error');
      alert('Failed to move word. Please try again.');
    }
  };

  const saveFamilyName = async (oldName: string, newName: string): Promise<string | null> => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return null;

    try {
      setSyncStatus('syncing');
      await vocabularyApi.renameDeck(oldName, trimmed);
      await reload();
      return trimmed;
    } catch (error) {
      console.error('Error renaming family:', error);
      setSyncStatus('error');
      alert('Failed to rename family. Please try again.');
      return null;
    }
  };

  const deleteFamily = async (familyName: string): Promise<boolean> => {
    const wordsInFamily = families[familyName]?.length ?? 0;
    const confirmed = window.confirm(
      `Delete "${familyName}"?\n\nThis will permanently delete ${wordsInFamily} word${
        wordsInFamily === 1 ? '' : 's'
      }.\n\nThis action cannot be undone.`
    );

    if (!confirmed) return false;

    try {
      setSyncStatus('syncing');
      await vocabularyApi.deleteDeckAndWords(familyName);
      await reload();
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
