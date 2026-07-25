import type { LegacyWord } from '../types/legacyWord';

interface FamiliesViewProps {
  families: Record<string, LegacyWord[]>;
  familyNames: string[];
  hasAnyContent: boolean;
  onSelectFamily: (name: string) => void;
}

export function FamiliesView({ families, familyNames, hasAnyContent, onSelectFamily }: FamiliesViewProps) {
  if (!hasAnyContent) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Start Building Your Vocabulary</div>
        <div className="empty-state-text">Tap the + button to add your first word</div>
      </div>
    );
  }

  return (
    <div className="family-grid">
      {familyNames.map((familyName) => (
        <div key={familyName} className="family-card" onClick={() => onSelectFamily(familyName)}>
          <div className="family-title">{familyName}</div>
          <div className="word-preview">
            {families[familyName].slice(0, 3).map((word) => (
              <div key={word.id} className="word-preview-item">
                &bull; {word.german}
              </div>
            ))}
            {families[familyName].length > 3 && (
              <div className="word-preview-item">+ {families[familyName].length - 3} more</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
