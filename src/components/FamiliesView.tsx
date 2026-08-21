import type { VocabWord } from '../types/vocabWord';

interface FamiliesViewProps {
  families: Record<string, VocabWord[]>;
  familyNames: string[];
  hasAnyContent: boolean;
  onSelectFamily: (name: string) => void;
}

export function FamiliesView({
  families,
  familyNames,
  hasAnyContent,
  onSelectFamily,
}: FamiliesViewProps) {
  if (!hasAnyContent) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Start Building Your Vocabulary</div>
        <div className="empty-state-text">Tap the + button to add your first word</div>
      </div>
    );
  }

  return (
    <div className="family-list">
      {familyNames.map((familyName) => {
        const words = families[familyName];
        const previewWords = words.slice(0, 3);
        const overflowCount = words.length - previewWords.length;

        return (
          <div
            key={familyName}
            className="family-list-row"
            onClick={() => onSelectFamily(familyName)}
          >
            <div>
              <div className="family-list-name">{familyName}</div>
              <div className="family-list-count">
                {words.length} word{words.length === 1 ? '' : 's'}
              </div>
              <div className="family-list-chips">
                {previewWords.map((word) => (
                  <div key={word.id} className="family-list-chip">
                    {word.text}
                  </div>
                ))}
                {overflowCount > 0 && (
                  <div className="family-list-chip overflow">+{overflowCount}</div>
                )}
              </div>
            </div>
            <div className="family-list-chevron">&rsaquo;</div>
          </div>
        );
      })}
    </div>
  );
}
