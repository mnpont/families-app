import type { NoteParts } from '../constants/conjugation';

/** The optional rule line: "aller uses **être** in the passé composé". */
export function ConjugationNote({ note }: { note: NoteParts | null }) {
  if (!note) return null;
  return (
    <div className="conj-note">
      {note.before}
      <strong>{note.bold}</strong>
      {note.after}
    </div>
  );
}
