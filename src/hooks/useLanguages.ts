import { useEffect, useState } from 'react';
import * as vocabularyApi from '../lib/vocabularyApi';
import type { Language, LanguageId } from '../types/models';

const SELECTED_LANGUAGE_KEY = 'selectedLanguageId';

/**
 * Drives the language selector from the `languages` table (migrations/001) --
 * adding a row there is enough for it to show up here, no code change needed.
 */
export function useLanguages() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguageId, setSelectedLanguageIdState] = useState<LanguageId | null>(
    localStorage.getItem(SELECTED_LANGUAGE_KEY)
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const fetched = await vocabularyApi.fetchLanguages();
        setLanguages(fetched);
        setSelectedLanguageIdState((current) => {
          if (current && fetched.some((l) => l.id === current)) return current;
          return fetched[0]?.id ?? null;
        });
      } catch (error) {
        console.error('Error loading languages:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setSelectedLanguageId = (languageId: LanguageId) => {
    setSelectedLanguageIdState(languageId);
    localStorage.setItem(SELECTED_LANGUAGE_KEY, languageId);
  };

  const addLanguage = async (id: LanguageId, name: string): Promise<boolean> => {
    const trimmedId = id.trim().toLowerCase();
    const trimmedName = name.trim();
    if (!trimmedId || !trimmedName) return false;

    if (languages.some((l) => l.id === trimmedId)) {
      alert('A language with this code already exists.');
      return false;
    }

    try {
      await vocabularyApi.createLanguage(trimmedId, trimmedName);
      setLanguages((current) => [...current, { id: trimmedId, name: trimmedName }].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedLanguageId(trimmedId);
      return true;
    } catch (error) {
      console.error('Error adding language:', error);
      alert('Failed to add language. Please try again.');
      return false;
    }
  };

  return { languages, selectedLanguageId, setSelectedLanguageId, addLanguage, loading };
}
