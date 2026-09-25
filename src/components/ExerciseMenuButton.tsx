import type { ExerciseIcon, ExerciseStatus } from '../constants/exercises';

interface ExerciseMenuButtonProps {
  name: string;
  description: string;
  icon: ExerciseIcon;
  status: ExerciseStatus;
  /** Tag under the description when not enabled ("Coming soon", "French only for now"). */
  tag?: string;
  /** Right-hand pill on an enabled entry: "12 due" (accent) or "18 verbs" (muted). */
  count?: { label: string; tone: 'accent' | 'muted' };
  onClick?: () => void;
}

function TileIcon({ icon }: { icon: ExerciseIcon }) {
  switch (icon) {
    case 'aa':
      return <span className="exercise-icon-text">Aa</span>;
    case 'je':
      return <span className="exercise-icon-text">je</span>;
    case 'gap':
      return (
        <span className="exercise-icon-gap" aria-hidden="true">
          <span className="exercise-icon-bar" />
          <span className="exercise-icon-blank" />
          <span className="exercise-icon-bar" />
        </span>
      );
    case 'chips':
      return (
        <span className="exercise-icon-chips" aria-hidden="true">
          <span className="exercise-icon-chip-row">
            <span className="exercise-icon-chip exercise-icon-chip--small" />
            <span className="exercise-icon-chip exercise-icon-chip--wide" />
          </span>
          <span className="exercise-icon-chip exercise-icon-chip--filled" />
        </span>
      );
  }
}

/** One entry in the Practice hub (screens 1a/1b): enabled, coming soon, or limited to other languages. */
export function ExerciseMenuButton({
  name,
  description,
  icon,
  status,
  tag,
  count,
  onClick,
}: ExerciseMenuButtonProps) {
  const body = (
    <>
      <span className="exercise-icon">
        <TileIcon icon={icon} />
      </span>
      <span className="exercise-body">
        <span className="exercise-name">{name}</span>
        <span className="exercise-description">{description}</span>
        {status !== 'enabled' && tag && (
          <span
            className={`exercise-tag ${status === 'languageLimited' ? 'exercise-tag--language' : ''}`}
          >
            {tag}
          </span>
        )}
      </span>
    </>
  );

  if (status !== 'enabled') {
    return (
      <div className="exercise-menu-button exercise-menu-button--disabled" aria-disabled="true">
        {body}
      </div>
    );
  }

  return (
    <button type="button" className="exercise-menu-button" onClick={onClick}>
      {body}
      <span className="exercise-side">
        {count && (
          <span className={`exercise-count exercise-count--${count.tone}`}>{count.label}</span>
        )}
        <span className="exercise-chevron" aria-hidden="true">
          ›
        </span>
      </span>
    </button>
  );
}
