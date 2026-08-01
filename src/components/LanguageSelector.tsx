import type { Language, LanguageId } from '../types/models';

interface LanguageSelectorProps {
  languages: Language[];
  selectedLanguageId: LanguageId | null;
  onChange: (languageId: LanguageId) => void;
}

/**
 * Renders purely from the `languages` table (src/hooks/useLanguages.ts) --
 * no language name/code is ever written into this component, so a new row
 * (e.g. Italian/'it') shows up here with zero code changes.
 */
export function LanguageSelector({ languages, selectedLanguageId, onChange }: LanguageSelectorProps) {
  if (languages.length === 0) return null;

  return (
    <select
      className="input-field language-selector"
      value={selectedLanguageId ?? ''}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Language"
    >
      {languages.map((language) => (
        <option key={language.id} value={language.id}>
          {language.name}
        </option>
      ))}
    </select>
  );
}
