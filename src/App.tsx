import { useState } from 'react';
import type { VocabWord } from './types/vocabWord';
import type { WordType } from './types/models';
import { useLanguages } from './hooks/useLanguages';
import { useVocabulary } from './hooks/useVocabulary';
import { Header } from './components/Header';
import { NavBar } from './components/NavBar';
import { FamiliesView } from './components/FamiliesView';
import { FlashcardsView } from './components/FlashcardsView';
import { PracticeView } from './components/PracticeView';
import { AddWordModal } from './components/AddWordModal';
import { ExpandedFamilyModal } from './components/ExpandedFamilyModal';
import { FamilySelectorModal } from './components/FamilySelectorModal';
import { EditWordModal } from './components/EditWordModal';
import { EditFamilyModal } from './components/EditFamilyModal';
import { ConjugationModal } from './components/ConjugationModal';
import { isConjugatable } from './utils/conjugationForms';

export type View = 'families' | 'flashcards' | 'practice';

export default function App() {
  const [view, setView] = useState<View>('families');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalMode, setAddModalMode] = useState<'word' | 'family'>('word');
  const [addModalInitialWordText, setAddModalInitialWordText] = useState('');
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);
  const [showFamilySelector, setShowFamilySelector] = useState<number | null>(null);
  const [editingWord, setEditingWord] = useState<VocabWord | null>(null);
  const [editingFamilyName, setEditingFamilyName] = useState<string | null>(null);
  const [conjugatingWord, setConjugatingWord] = useState<VocabWord | null>(null);
  // Bumped when the Practice button is tapped while already on Practice:
  // remounting PracticeView (it's part of its key, with the language) is
  // what returns to the hub from inside an exercise.
  const [practiceResetKey, setPracticeResetKey] = useState(0);

  const { languages, selectedLanguageId, setSelectedLanguageId, addLanguage } = useLanguages();
  const selectedLanguageName = languages.find((l) => l.id === selectedLanguageId)?.name ?? '';

  const {
    words,
    families,
    familyNames,
    syncStatus,
    addWord,
    addFamily,
    deleteWord,
    saveEditWord,
    moveToFamily,
    saveFamilyName,
    deleteFamily,
  } = useVocabulary(selectedLanguageId);

  const handleViewChange = (next: View) => {
    if (next === 'practice' && view === 'practice') setPracticeResetKey((k) => k + 1);
    setView(next);
  };

  const handleOpenAddWord = () => {
    setAddModalMode('word');
    setAddModalInitialWordText('');
    setShowAddModal(true);
  };

  const handleOpenAddFamily = () => {
    setAddModalMode('family');
    setAddModalInitialWordText('');
    setShowAddModal(true);
  };

  const handleAddWordFromSearch = (text: string) => {
    setAddModalMode('word');
    setAddModalInitialWordText(text);
    setShowAddModal(true);
  };

  const handleAddFamily = (name: string) => {
    const success = addFamily(name, families);
    if (success) setShowAddModal(false);
  };

  const handleAddLanguage = async (id: string, name: string) => {
    const success = await addLanguage(id, name);
    if (success) setShowAddModal(false);
  };

  const handleDeleteFamily = async (name: string) => {
    const success = await deleteFamily(name);
    if (success) setExpandedFamily(null);
  };

  const handleMoveToFamily = async (wordId: number, newFamily: string) => {
    await moveToFamily(wordId, newFamily);
    setShowFamilySelector(null);
  };

  const handleSaveEditWord = async (
    wordId: number,
    text: string,
    translationText: string,
    partOfSpeech: WordType | null,
  ) => {
    const success = await saveEditWord(wordId, text, translationText, partOfSpeech);
    if (success) setEditingWord(null);
  };

  const handleSaveFamilyName = async (oldName: string, newName: string) => {
    const renamedTo = await saveFamilyName(oldName, newName);
    if (renamedTo) setExpandedFamily(renamedTo);
    setEditingFamilyName(null);
  };

  return (
    <div className="app-container">
      <div className="orb-accent"></div>
      <Header
        view={view}
        syncStatus={syncStatus}
        languages={languages}
        selectedLanguageId={selectedLanguageId}
        onLanguageChange={setSelectedLanguageId}
        onAddClick={handleOpenAddWord}
        onAddFamilyClick={handleOpenAddFamily}
      />

      {view === 'families' && (
        <FamiliesView
          languageId={selectedLanguageId}
          words={words}
          families={families}
          familyNames={familyNames}
          hasAnyContent={familyNames.length > 0}
          onSelectFamily={setExpandedFamily}
          onAddWordWithText={handleAddWordFromSearch}
        />
      )}

      {view !== 'families' && (
        <div className="content">
          {view === 'flashcards' && <FlashcardsView languageId={selectedLanguageId} />}

          {view === 'practice' && (
            <PracticeView
              key={`${selectedLanguageId}:${practiceResetKey}`}
              languageId={selectedLanguageId}
              onGoToFamilies={() => setView('families')}
            />
          )}
        </div>
      )}

      {showAddModal && (
        <AddWordModal
          languageId={selectedLanguageId}
          languageName={selectedLanguageName}
          familyNames={familyNames}
          initialMode={addModalMode}
          initialWordText={addModalInitialWordText}
          onClose={() => setShowAddModal(false)}
          onAddWord={addWord}
          onAddFamily={handleAddFamily}
          onAddLanguage={handleAddLanguage}
        />
      )}

      {expandedFamily && (
        <ExpandedFamilyModal
          familyName={expandedFamily}
          words={families[expandedFamily] ?? []}
          onClose={() => {
            setExpandedFamily(null);
            setShowFamilySelector(null);
          }}
          onEditFamilyName={setEditingFamilyName}
          onDeleteFamily={handleDeleteFamily}
          onOpenFamilySelector={setShowFamilySelector}
          onEditWord={setEditingWord}
          onDeleteWord={deleteWord}
          onConjugate={setConjugatingWord}
        />
      )}

      {conjugatingWord && isConjugatable(conjugatingWord) && (
        <ConjugationModal word={conjugatingWord} onClose={() => setConjugatingWord(null)} />
      )}

      {showFamilySelector !== null && expandedFamily && (
        <FamilySelectorModal
          wordText={
            (families[expandedFamily] ?? []).find((word) => word.id === showFamilySelector)?.text ??
            ''
          }
          familyNames={familyNames}
          currentFamily={expandedFamily}
          onClose={() => setShowFamilySelector(null)}
          onSelectFamily={(name) => handleMoveToFamily(showFamilySelector, name)}
        />
      )}

      {editingWord && (
        <EditWordModal
          word={editingWord}
          languageName={selectedLanguageName}
          onClose={() => setEditingWord(null)}
          onSave={handleSaveEditWord}
        />
      )}

      {editingFamilyName && (
        <EditFamilyModal
          currentName={editingFamilyName}
          onClose={() => setEditingFamilyName(null)}
          onSave={handleSaveFamilyName}
        />
      )}

      <NavBar view={view} onViewChange={handleViewChange} />
    </div>
  );
}
