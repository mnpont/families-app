import { useState } from 'react';
import type { LegacyWord } from './types/legacyWord';
import { useVocabulary } from './hooks/useVocabulary';
import { Header } from './components/Header';
import { NavBar } from './components/NavBar';
import { FamiliesView } from './components/FamiliesView';
import { FlashcardsView } from './components/FlashcardsView';
import { AddWordModal } from './components/AddWordModal';
import { ExpandedFamilyModal } from './components/ExpandedFamilyModal';
import { FamilySelectorModal } from './components/FamilySelectorModal';
import { EditWordModal } from './components/EditWordModal';
import { EditFamilyModal } from './components/EditFamilyModal';

export type View = 'families' | 'flashcards';

export default function App() {
  const [view, setView] = useState<View>('families');
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);
  const [showFamilySelector, setShowFamilySelector] = useState<number | null>(null);
  const [editingWord, setEditingWord] = useState<LegacyWord | null>(null);
  const [editingFamilyName, setEditingFamilyName] = useState<string | null>(null);

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
  } = useVocabulary();

  const handleAddWord = async (german: string, english: string) => {
    const success = await addWord(german, english);
    if (success) setShowAddModal(false);
  };

  const handleAddFamily = (name: string) => {
    const success = addFamily(name, families);
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

  const handleCreateNewFamily = (wordId: number) => {
    const familyName = prompt('Enter new family name:');
    if (familyName && familyName.trim()) {
      handleMoveToFamily(wordId, familyName.trim());
    }
  };

  const handleSaveEditWord = async (wordId: number, german: string, english: string) => {
    const success = await saveEditWord(wordId, german, english);
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
      <Header view={view} syncStatus={syncStatus} onAddClick={() => setShowAddModal(true)} />

      <div className="content">
        {view === 'families' && (
          <FamiliesView
            families={families}
            familyNames={familyNames}
            hasAnyContent={familyNames.length > 0}
            onSelectFamily={setExpandedFamily}
          />
        )}

        {view === 'flashcards' && <FlashcardsView words={words} />}
      </div>

      {showAddModal && (
        <AddWordModal onClose={() => setShowAddModal(false)} onAddWord={handleAddWord} onAddFamily={handleAddFamily} />
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
        />
      )}

      {showFamilySelector !== null && expandedFamily && (
        <FamilySelectorModal
          familyNames={familyNames}
          currentFamily={expandedFamily}
          onClose={() => setShowFamilySelector(null)}
          onSelectFamily={(name) => handleMoveToFamily(showFamilySelector, name)}
          onCreateNewFamily={() => handleCreateNewFamily(showFamilySelector)}
        />
      )}

      {editingWord && (
        <EditWordModal word={editingWord} onClose={() => setEditingWord(null)} onSave={handleSaveEditWord} />
      )}

      {editingFamilyName && (
        <EditFamilyModal
          currentName={editingFamilyName}
          onClose={() => setEditingFamilyName(null)}
          onSave={handleSaveFamilyName}
        />
      )}

      <NavBar view={view} onViewChange={setView} />
    </div>
  );
}
