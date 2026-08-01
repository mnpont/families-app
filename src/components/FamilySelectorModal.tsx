import { DeleteIcon } from './icons/DeleteIcon';

interface FamilySelectorModalProps {
  familyNames: string[];
  currentFamily: string;
  onClose: () => void;
  onSelectFamily: (name: string) => void;
  onCreateNewFamily: () => void;
}

export function FamilySelectorModal({
  familyNames,
  currentFamily,
  onClose,
  onSelectFamily,
  onCreateNewFamily,
}: FamilySelectorModalProps) {
  return (
    <div className="family-selector-overlay" onClick={onClose}>
      <div className="family-selector-modal" onClick={(e) => e.stopPropagation()}>
        <div className="family-selector-header">
          <div className="family-selector-title">Move to family</div>
          <button className="family-selector-close" onClick={onClose}>
            <DeleteIcon />
          </button>
        </div>
        {familyNames
          .filter((f) => f !== currentFamily)
          .map((familyName) => (
            <div key={familyName} className="family-option" onClick={() => onSelectFamily(familyName)}>
              {familyName}
            </div>
          ))}
        <div className="family-option create-new" onClick={onCreateNewFamily}>
          + Create New Family
        </div>
      </div>
    </div>
  );
}
