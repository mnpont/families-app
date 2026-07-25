import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { classifyWord } from '../utils/classifyWord';
import { preLoadedWords } from '../data/preLoadedWords';
import type { LegacyWord, LegacyWordRow } from '../types/legacyWord';

export type SyncStatus = 'synced' | 'syncing' | 'error';

function rowToLocalWord(row: LegacyWordRow): LegacyWord {
  return {
    id: row.id,
    german: row.german,
    english: row.english,
    family: row.family,
    dateAdded: row.date_added,
    exampleSentenceDe: row.example_sentence_de ?? null,
    exampleSentenceEn: row.example_sentence_en ?? null,
  };
}

/**
 * Loads/persists the vocabulary list, mirroring the Supabase `words` table
 * and falling back to localStorage. Lifted from the original App() function
 * in index.html (see docs/audit.md Section 1) with no behavior changes --
 * still the legacy German/English schema and the same dual-writer pattern.
 * Phase 2 will replace this with the v2 schema (docs/v2-plan.md Section 1).
 */
export function useVocabulary() {
  const [words, setWords] = useState<LegacyWord[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [emptyFamilies, setEmptyFamilies] = useState<string[]>(() => {
    const saved = localStorage.getItem('germanVocabEmptyFamilies');
    return saved ? JSON.parse(saved) : [];
  });

  // Load words from Supabase/localStorage on mount
  useEffect(() => {
    const loadWords = async () => {
      try {
        setSyncStatus('syncing');

        const { data, error } = await supabase
          .from('words')
          .select('*')
          .order('date_added', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const localWords = (data as LegacyWordRow[]).map(rowToLocalWord);
          setWords(localWords);
          localStorage.setItem('germanVocab', JSON.stringify(localWords));
          localStorage.setItem('germanVocabVersion', '1.0');
          setSyncStatus('synced');
        } else {
          const saved = localStorage.getItem('germanVocab');
          const version = localStorage.getItem('germanVocabVersion');

          if (version !== '1.0') {
            setWords(preLoadedWords);
            localStorage.setItem('germanVocab', JSON.stringify(preLoadedWords));
            localStorage.setItem('germanVocabVersion', '1.0');

            for (const word of preLoadedWords) {
              await supabase.from('words').insert({
                german: word.german,
                english: word.english,
                family: word.family,
                date_added: word.dateAdded,
                user_id: null,
              });
            }
            setSyncStatus('synced');
          } else if (saved) {
            const localWords = JSON.parse(saved) as LegacyWord[];
            setWords(localWords);

            for (const word of localWords) {
              await supabase.from('words').insert({
                german: word.german,
                english: word.english,
                family: word.family,
                date_added: word.dateAdded,
                user_id: null,
              });
            }
            setSyncStatus('synced');
          } else {
            setWords([]);
            setSyncStatus('synced');
          }
        }
      } catch (error) {
        console.error('Error loading words:', error);
        const saved = localStorage.getItem('germanVocab');
        const version = localStorage.getItem('germanVocabVersion');

        if (version !== '1.0') {
          setWords(preLoadedWords);
          localStorage.setItem('germanVocab', JSON.stringify(preLoadedWords));
          localStorage.setItem('germanVocabVersion', '1.0');
        } else if (saved) {
          setWords(JSON.parse(saved));
        }
        setSyncStatus('error');
      }
    };

    loadWords();
  }, []);

  // Save words to localStorage whenever they change
  useEffect(() => {
    if (words.length > 0) {
      localStorage.setItem('germanVocab', JSON.stringify(words));
    }
  }, [words]);

  // Save empty families to localStorage
  useEffect(() => {
    localStorage.setItem('germanVocabEmptyFamilies', JSON.stringify(emptyFamilies));
  }, [emptyFamilies]);

  // Clean up empty families that now have words
  useEffect(() => {
    const wordFamilies = new Set(words.map((w) => w.family));
    setEmptyFamilies((prev) => {
      const stillEmpty = prev.filter((name) => !wordFamilies.has(name));
      return stillEmpty.length !== prev.length ? stillEmpty : prev;
    });
  }, [words]);

  const addWord = async (germanWord: string, englishWord: string): Promise<boolean> => {
    if (!germanWord.trim() || !englishWord.trim()) return false;

    try {
      setSyncStatus('syncing');
      const family = classifyWord(germanWord, englishWord);

      const newWord = {
        german: germanWord.trim(),
        english: englishWord.trim(),
        family,
        date_added: new Date().toISOString(),
        user_id: null,
      };

      const { data, error } = await supabase.from('words').insert(newWord).select().single();

      if (error) throw error;

      const localWord: LegacyWord = {
        id: data.id,
        german: data.german,
        english: data.english,
        family: data.family,
        dateAdded: data.date_added,
      };

      setWords((prev) => [...prev, localWord]);
      setSyncStatus('synced');
      return true;
    } catch (error) {
      console.error('Error adding word:', error);
      setSyncStatus('error');
      alert('Failed to add word. Please try again.');
      return false;
    }
  };

  const addFamily = (name: string, families: Record<string, LegacyWord[]>): boolean => {
    const trimmedName = name.trim();
    if (!trimmedName) return false;

    if (families[trimmedName]) {
      alert('A family with this name already exists.');
      return false;
    }

    setEmptyFamilies((prev) => [...prev, trimmedName]);
    return true;
  };

  const deleteWord = async (wordId: number) => {
    if (!confirm('Are you sure you want to delete this word?')) return;

    try {
      setSyncStatus('syncing');

      const { error } = await supabase.from('words').delete().eq('id', wordId);
      if (error) throw error;

      setWords((prev) => prev.filter((w) => w.id !== wordId));
      setSyncStatus('synced');
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

      const { error } = await supabase
        .from('words')
        .update({ german: german.trim(), english: english.trim() })
        .eq('id', wordId);

      if (error) throw error;

      setWords((prev) =>
        prev.map((w) => (w.id === wordId ? { ...w, german: german.trim(), english: english.trim() } : w))
      );
      setSyncStatus('synced');
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

      const { error } = await supabase.from('words').update({ family: newFamily }).eq('id', wordId);
      if (error) throw error;

      setWords((prev) => prev.map((w) => (w.id === wordId ? { ...w, family: newFamily } : w)));
      setSyncStatus('synced');
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

      const { error } = await supabase.from('words').update({ family: trimmed }).eq('family', oldName);
      if (error) throw error;

      setWords((prev) => prev.map((w) => (w.family === oldName ? { ...w, family: trimmed } : w)));
      setSyncStatus('synced');
      return trimmed;
    } catch (error) {
      console.error('Error renaming family:', error);
      setSyncStatus('error');
      alert('Failed to rename family. Please try again.');
      return null;
    }
  };

  const deleteFamily = async (familyName: string): Promise<boolean> => {
    const wordsInFamily = words.filter((w) => w.family === familyName).length;
    const confirmed = window.confirm(
      `Delete "${familyName}"?\n\nThis will permanently delete ${wordsInFamily} word${
        wordsInFamily === 1 ? '' : 's'
      }.\n\nThis action cannot be undone.`
    );

    if (!confirmed) return false;

    try {
      setSyncStatus('syncing');

      const { error } = await supabase.from('words').delete().eq('family', familyName);
      if (error) throw error;

      setWords((prev) => prev.filter((w) => w.family !== familyName));
      setSyncStatus('synced');
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
    syncStatus,
    emptyFamilies,
    addWord,
    addFamily,
    deleteWord,
    saveEditWord,
    moveToFamily,
    saveFamilyName,
    deleteFamily,
  };
}
