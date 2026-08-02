import type { Language, LanguageId } from '../types/models';

interface LanguageSelectorProps {
  languages: Language[];
  selectedLanguageId: LanguageId | null;
  onChange: (languageId: LanguageId) => void;
  onAddLanguageClick: () => void;
}

/**
 * Renders purely from the `languages` table (src/hooks/useLanguages.ts) --
 * no language name/code is ever written into this component, so a new row
 * (e.g. Italian/'it') shows up here with zero code changes.
 */
export function LanguageSelector({ languages, selectedLanguageId, onChange, onAddLanguageClick }: LanguageSelectorProps) {
  return (
    <div className="language-selector-row">
      {languages.length > 0 && (
        <div className="language-pills" role="group" aria-label="Language">
          {languages.map((language) => (
            <button
              key={language.id}
              type="button"
              className={`language-pill ${language.id === selectedLanguageId ? 'active' : ''}`}
              onClick={() => onChange(language.id)}
            >
              {language.name}
            </button>
          ))}
        </div>
      )}
      <button className="language-add-button" onClick={onAddLanguageClick} aria-label="Add language">
        +
      </button>
    </div>
  );
}
