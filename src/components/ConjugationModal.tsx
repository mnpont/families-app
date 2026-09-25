import { Fragment, useEffect, useRef, useState } from 'react';
import { conjugationConfigFor, offeredTenses } from '../constants/conjugation';
import type { Conjugations } from '../types/conjugations';
import type { VocabWord } from '../types/vocabWord';
import { ConjugationNote } from './ConjugationNote';
import { ConjugationTable } from './ConjugationTable';
import { DeleteIcon } from './icons/DeleteIcon';

interface ConjugationModalProps {
  word: VocabWord & { conjugations: Conjugations };
  onClose: () => void;
}

/**
 * A verb's conjugation tables (screen 7b), opened from its Conjugate pill
 * in ExpandedFamilyModal and stacked on top of it. Shows every tense the
 * drill offers, so enabling a tense in src/constants/conjugation.ts adds it
 * here too.
 */
export function ConjugationModal({ word, onClose }: ConjugationModalProps) {
  const config = conjugationConfigFor(word.languageId);
  const [showBottomFade, setShowBottomFade] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Same overflow fade as ExpandedFamilyModal.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const checkOverflow = () =>
      setShowBottomFade(el.scrollHeight > el.clientHeight + el.scrollTop + 1);
    checkOverflow();
    el.addEventListener('scroll', checkOverflow);
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', checkOverflow);
      observer.disconnect();
    };
  }, []);

  if (!config) return null;
  const tenses = offeredTenses(config).filter((t) => word.conjugations.tenses[t.key]);
  // The last note any offered tense has (for French, the passé composé's).
  const note = tenses
    .map((t) => config.note(word.conjugations, t.key))
    .filter((n) => n !== null)
    .pop();

  return (
    <div className="overlay conj-modal-overlay" onClick={onClose}>
      <div className="expanded-family" onClick={(e) => e.stopPropagation()}>
        <button className="expanded-family-close" onClick={onClose} title="Close">
          <DeleteIcon />
        </button>

        <div className="expanded-family-scroll conj-modal-scroll" ref={scrollRef}>
          <div className="expanded-family-title">{config.displayInfinitive(word.conjugations)}</div>
          {word.translation && (
            <div className="expanded-family-meta">
              <div className="expanded-family-count-pill">{word.translation.text}</div>
            </div>
          )}

          {tenses.map((tense, i) => (
            <Fragment key={tense.key}>
              {i > 0 && <div className="conj-modal-divider" />}
              <div className="conj-modal-section">
                <span className="conj-tense-pill">{tense.label}</span>
                <ConjugationTable
                  config={config}
                  conjugations={word.conjugations}
                  tense={tense.key}
                />
              </div>
            </Fragment>
          ))}

          <ConjugationNote note={note ?? null} />
        </div>
        {showBottomFade && <div className="expanded-family-fade" />}
      </div>
    </div>
  );
}
