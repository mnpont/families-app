import { useState } from 'react';
import { flushSync } from 'react-dom';
import { conjugationConfigFor, DRILL_SESSION_SIZE, offeredTenses } from '../constants/conjugation';
import type { ExerciseId } from '../constants/exercises';
import { useConjugationPool } from '../hooks/useConjugationPool';
import { useDueCount } from '../hooks/useDueCount';
import type { LanguageId } from '../types/models';
import { countCombinations } from '../utils/buildConjugationQueue';
import { ConjugationDrillView } from './ConjugationDrillView';
import { ConjugationSetupSheet } from './ConjugationSetupSheet';
import { MultipleChoiceView } from './MultipleChoiceView';
import { PracticeHub } from './PracticeHub';

interface PracticeViewProps {
  languageId: LanguageId | null;
  onGoToFamilies: () => void;
}

/**
 * Which Practice screen is showing -- sub-state inside the tab, no router:
 *
 *   hub -> conjugationSetup (sheet over the hub) -> conjugationDrill -> hub
 *   hub -> multipleChoice
 *
 * App remounts this component (a new key) when the language changes or the
 * Practice nav button is tapped while already on Practice, which is what
 * returns to the hub from inside any exercise.
 */
type PracticeMode = 'hub' | 'multipleChoice' | 'conjugationSetup' | 'conjugationDrill';

export function PracticeView({ languageId, onGoToFamilies }: PracticeViewProps) {
  const [mode, setMode] = useState<PracticeMode>('hub');
  const config = conjugationConfigFor(languageId);
  const tenses = config ? offeredTenses(config) : [];
  // Per visit, never persisted: the defaultOn tenses start on.
  const [selectedTenses, setSelectedTenses] = useState(() =>
    tenses.filter((t) => t.defaultOn).map((t) => t.key),
  );
  const [sessionKey, setSessionKey] = useState(0);

  const { verbs, loading: verbsLoading } = useConjugationPool(languageId);
  const dueCount = useDueCount(languageId);

  const persons = config?.persons.map((p) => p.key) ?? [];
  const questionCount = Math.min(
    DRILL_SESSION_SIZE,
    countCombinations(verbs, selectedTenses, persons),
  );

  const toHub = () => setMode('hub');

  const onSelect = (id: ExerciseId) => {
    if (id === 'multipleChoice') setMode('multipleChoice');
    if (id === 'conjugationDrill') setMode('conjugationSetup');
  };

  // flushSync: the drill focuses its input while mounting, and iOS only
  // opens the keyboard for a focus() inside this same tap (see
  // ConjugationDrillView).
  const startDrill = () => flushSync(() => setMode('conjugationDrill'));
  const practiceAgain = () => flushSync(() => setSessionKey((k) => k + 1));

  if (mode === 'multipleChoice') {
    return <MultipleChoiceView languageId={languageId} />;
  }

  if (mode === 'conjugationDrill' && config) {
    return (
      <ConjugationDrillView
        key={sessionKey}
        config={config}
        verbs={verbs}
        tenses={tenses.filter((t) => selectedTenses.includes(t.key))}
        onExit={toHub}
        onPracticeAgain={practiceAgain}
      />
    );
  }

  if (mode === 'conjugationSetup' && verbsLoading) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Loading...</div>
      </div>
    );
  }

  if (mode === 'conjugationSetup' && verbs.length === 0) {
    return (
      <div className="practice-screen">
        <div className="practice-back-row">
          <button type="button" className="word-search-back" onClick={toHub}>
            ‹ Practice
          </button>
        </div>
        <div className="empty-state">
          <div className="empty-state-title">No verbs yet</div>
          <div className="empty-state-text">
            Add verbs in Families and they&apos;ll show up here automatically.
          </div>
          <button
            type="button"
            className="word-search-add-button practice-empty-action"
            onClick={onGoToFamilies}
          >
            Go to Families
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PracticeHub
        languageId={languageId}
        dueCount={dueCount}
        verbCount={config && !verbsLoading ? verbs.length : null}
        onSelect={onSelect}
      />
      {mode === 'conjugationSetup' && (
        <ConjugationSetupSheet
          tenses={tenses}
          selected={selectedTenses}
          onChange={setSelectedTenses}
          verbCount={verbs.length}
          questionCount={questionCount}
          onStart={startDrill}
          onClose={toHub}
        />
      )}
    </>
  );
}
