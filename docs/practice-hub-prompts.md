# Practice Hub — Prompts for Claude Design and Claude Code

The Practice hub is built one feature at a time. Each feature follows the same loop:

1. Paste the **Design** prompt into Claude Design (it reads the repo), iterate, and produce the handoff.
2. Open a new Claude Code session, attach the Claude Design handoff, and paste the matching **Code** prompt.
3. Merge to `main` before starting the next feature, because each later prompt builds on what the previous one shipped.

| Feature | Design prompt | Code prompt | Needs merged first |
|---|---|---|---|
| 1. Practice hub + Conjugation Drill | 1A | 1B | nothing (everything it references is already on `main`) |
| 2. Fill the Gap | 2A | 2B | Feature 1 |
| 3. Build the Sentence | 3A | 3B | Feature 1 |

The Code prompts cover behavior, data and logic only. For visuals, layout and copy, the Claude Design handoff is the source of truth.

> **Update after the first handoff:** Claude Design produced one handoff covering all three features: Fill the Gap is screens 8a/8b and Build the Sentence is screens 9a/9b, at lower fidelity. Reattach that same handoff for 2B and 3B. Prompts 2A and 3A are now optional (only needed for a redesign). The Code prompts below are the current versions; the latest copies are in the chat where they were written.

---

## 1A — Claude Design: Practice hub + Conjugation Drill

````
Design a new feature for "Families", my mobile-first vocabulary app for learning French and German (repo: mnpont/families-app). Read the repo first so the design matches the existing look and components: src/styles/index.css, src/components/PracticeView.tsx, MultipleChoiceCard.tsx, Header.tsx, NavBar.tsx and ExpandedFamilyModal.tsx. I use it mostly on an iPhone: design at 390×844, and it should also work as a centered column on desktop. Keep the existing header and bottom nav on every screen.

The feature: the pencil (Practice) tab becomes a **Practice hub**, a menu of exercise types, and gets its first new exercise, a **Conjugation Drill** for French verbs. The existing Multiple Choice exercise stays exactly as it is, as one of the options in the menu. I've attached a hand sketch of the menu layout: follow its structure.

## Screen 1 — Practice menu

- A vertical stack of large, tappable exercise buttons, as in my sketch. Right now it has two: **Multiple Choice** ("Pick the right translation") and **Conjugation Drill** ("Type the right verb form"). Each button: name in bold, a one-line description in muted text, optionally a small icon.
- More exercise types will be added one at a time later, so the component must scale to 5–8 buttons (scrolling when needed). Don't show placeholder or "coming soon" buttons.
- Disabled state for an exercise that isn't available in the selected language: the Conjugation Drill while German is selected shows as disabled with a small "French only for now" tag.
- Optional, nice to have: a small count on a button, e.g. "18 verbs" or "12 due".

## Screen 2 — Conjugation Drill: setup (bottom sheet or compact screen)

- Title and explainer: "Type the correct form of your saved verbs."
- Tense chips to toggle for this session: "Présent" and "Passé composé", both on by default. At least one must stay on. Must fit up to ~6 chips (more tenses come later).
- Info line: "18 verbs · 20 questions". A primary "Start" button, and a way back to the menu.

## Screen 3 — Question

- A back/close control (returns to the menu) and a progress bar with a "7/20" label, reusing the Multiple Choice progress bar.
- The prompt, large: subject pronoun ("nous"; also "je"/"j'", tu, il, elle, vous, ils, elles), the infinitive emphasized ("aller"), a small tense pill ("Passé composé"), and the English meaning in small muted text ("to go").
- A single text input with a "Check" button. The user types only what comes after the pronoun ("sommes allés"), and Enter submits. No accent buttons: I use my own keyboard.
- Show the layout with the iPhone keyboard open. The input must stay visible above it.

## Screen 4 — Feedback: three states on the same card, with "Next" (Enter also works)

1. **Correct** (green): my answer with a check. Very light.
2. **Almost** (amber, a new state): only the accents were wrong ("etes" for "êtes"). "Almost — watch the accents", with the correct form's accented letters highlighted and my version below it.
3. **Wrong** (red): my answer struck through or dimmed; the correct form with the differing letters highlighted; a compact conjugation table for that verb and tense (pronoun | form, 6–8 rows) with the asked row highlighted; and an optional short note line ("aller uses être in the passé composé"). Example table, aller, passé composé: je suis allé(e), tu es allé(e), il est allé, elle est allée, nous sommes allé(e)s, vous êtes allé(e)(s), ils sont allés, elles sont allées.

## Screen 5 — End of session

The score ("17 / 20 on the first try"), a list of the missed forms ("nous · aller · passé composé → sommes allés"), and "Practice again" (primary) and "Back to Practice" (secondary).

## Screen 6 — Empty and loading states

- No verbs: "No verbs yet. Add verbs in Families and they'll show up here automatically." plus a button that goes to Families.
- Loading: matches the app's existing minimal loading state.

## Screen 7 — Conjugation table from Families

In an expanded family's word list, verb rows get a small "Conjugate" pill. Tapping it opens a modal with that verb's full tables, one section per tense (Présent, Passé composé), in the same table style as Screen 4, with a close button.

## Deliverables

High-fidelity mockups of Screens 1–7 and a small consistent component set: exercise menu button (enabled/disabled), tense chip, prompt block, answer input, feedback card (correct/almost/wrong), conjugation table, end-of-session summary. These components will be reused by future exercises (typed-answer and sentence exercises), so keep them generic. Calm and uncluttered: a focused study tool, not a game (no mascots, confetti, streaks or points).
````

---

## 1B — Claude Code: Practice hub + Conjugation Drill

````
Implement the Practice hub and the Conjugation Drill in this repo (mnpont/families-app). I've attached the Claude Design handoff: it's the source of truth for visuals, layout, copy and component structure. This prompt defines behavior, data and logic. If they conflict on behavior, this prompt wins.

Read these first and match the codebase's conventions (comment density and "why" comments, naming, hooks-per-feature, one CSS file src/styles/index.css, numbered SQL migrations, fire-and-forget Edge Function calls): README.md, docs/v2-plan.md, docs/phase2-exercise-methods.md, docs/practice-mc-spec.md, migrations/README.md, supabase/functions/README.md, src/App.tsx, src/components/PracticeView.tsx, src/hooks/usePracticeSession.ts, src/hooks/useReviewSession.ts, src/lib/vocabularyApi.ts, supabase/functions/_shared/generateSentence.ts, supabase/functions/generate-example-sentence/index.ts, supabase/functions/batch-generate-sentences/index.ts, scripts/backfillWordGender.ts.

## Decisions already made (don't re-litigate)

- **French only in this phase.** I know the présent and passé composé fully. German comes in a later phase, and nothing here may change how the app behaves with German selected.
- Learning principles this feature is built on:
  - typed production, never picking from options;
  - retrieval practice;
  - interleaving verbs, persons and tenses, never blocked by verb;
  - immediate explicit corrective feedback: the correct form, the differing letters and the full paradigm after a miss.
- **Free practice, no spaced repetition for the drill.** No new schedule table and no review_log writes. A missed item comes back later in the same session. Multiple Choice and its SRS stay untouched.
- **Auto-grading** with three outcomes: correct / almost (accent-only mistakes) / wrong. No Again/Hard/Good/Easy buttons in the drill.
- **No accent buttons.**
- **Correct forms come from a rule-based conjugation library, not an LLM.** LLM generation is a fallback only if the library turns out to be unusable (Step 1).

## Existing behavior you need to know

`words.part_of_speech` is ONLY set when I manually pick a word type in Add/Edit Word. Nothing sets it automatically, and many of my verbs were saved without it. The drill must not depend on me having tagged them: verb detection is automatic (Step 3).

## Step 1 — Spike (report the results to me before building on them)

Candidate libraries: `french-verbs` + `french-verbs-lefff` (RosaeNLG project). For the later German phase: `german-verbs` + `german-verbs-dict`. Verify:
1. They run in a Supabase Edge Function (Deno, `npm:` specifiers) within the size and memory limits. The Lefff dictionary is large, so measure it.
2. They give correct présent and passé composé forms. Check:
   - être vs avoir as the auxiliary;
   - agreement with être (elle est allée, ils sont allés, elles sont allées);
   - pronominal verbs (se lever: je me lève, je me suis levé(e));
   - the irregulars être, avoir, aller, faire, pouvoir, vouloir, devoir, savoir, venir, prendre, dire, voir, mettre, tenir;
   - spelling-change -er verbs (nous mangeons, nous commençons, j'appelle, j'achète).
   Spot-check at least 15 verbs against a trusted reference.
3. Their licenses are OK for a personal/open project.

If the library can't run in an Edge Function, try generating from a Node script under scripts/. Only as a last resort, fall back to gpt-4o-mini using the existing OpenAI pattern with a strict JSON schema. Tell me which route you took and why.

## Step 2 — Data (migration 016)

- `migrations/016_add_words_conjugations.sql`: a nullable `words.conjugations jsonb` column, documented in migrations/README.md.
- Store every tense the library supports, so enabling more tenses later needs no regeneration.
- Suggested shape (refine if needed, and document the final shape in the migration comment and a TS type):
  `{ "version": 1, "source": "lefff" | "llm", "infinitive": "aller", "pronominal": false, "auxiliary": "etre", "tenses": { "present": { "je": "vais", ..., "elles": "vont" }, "passe_compose": { "je": ["suis allé", "suis allée"], "elle": ["est allée"], "nous": ["sommes allés", "sommes allées"], "vous": ["êtes allé", "êtes allée", "êtes allés", "êtes allées"], ... } } }`
  - A person holds one string or an array of accepted variants; the first one is canonical.
  - Handle je/j' elision for display (store it per person, or derive it from the answer's first letter). Document which.
  - Pronominal answers include the reflexive pronoun ("me lève", "me suis levé"), because I type everything after the subject.
- Load `conjugations` with the vocabulary: update the types and the select strings in vocabularyApi.ts.

## Step 3 — Generation and automatic verb detection

- Edge Function `generate-conjugations` (shared logic in `supabase/functions/_shared/generateConjugations.ts`) plus `batch-generate-conjugations`, mirroring the sentence functions.
- Fired and forgotten after a word is added or edited, exactly like the existing generate-example-sentence / generate-distractors calls. It must never slow down adding a word.
- Only for `CONJUGATION_LANGUAGES = ['fr']`; other languages are a no-op.
- Detection:
  1. part_of_speech set to anything other than 'verb' → skip.
  2. Normalize: trim and lowercase; strip a leading "se " / "s'" and remember that it's pronominal. If the text starts with an article (le, la, l', les, un, une, des) → skip.
  3. Found in the dictionary → store `conjugations`, and set part_of_speech to 'verb' if it was null.
  4. Not found → leave the word untouched (log it if it was manually tagged 'verb').
- If I change a word's type away from 'verb' later, it must drop out of the drill. Pick one approach (clear the data, or filter it out) and keep it consistent.
- Accepted limitation: an infinitive saved without an article as a noun (e.g. "dîner") gets tagged as a verb, and I can fix it in Edit Word.
- Backfill for existing French words: `scripts/backfillConjugations.ts` with npm scripts `backfill:conjugations-dry-run` and `backfill:conjugations-live`, following the gender backfill. The dry run lists the words that would be tagged as verbs.

## Step 4 — Practice hub

- The pencil tab opens the menu from the handoff. Its entries: **Multiple Choice** (the existing PracticeView, behavior unchanged) and **Conjugation Drill**.
- Exercises are defined as data in one registry (e.g. `src/constants/exercises.ts`: id, name, description, component, `isAvailable(languageId)`, unavailable reason), so a future exercise is one entry plus its component. The drill is unavailable outside CONJUGATION_LANGUAGES.
- Navigation is simple state (e.g. `practiceExercise: ExerciseId | null`), with no router. Each exercise's back control returns to the menu. So does tapping the pencil icon while in an exercise, and so does switching language.
- The header behaves as it does today.

## Step 5 — Conjugation Drill logic

- Config in `src/constants/conjugation.ts`, per language: persons and their labels, and tenses (key, label, offered or not). French offers présent and passé composé. Imparfait, futur simple, conditionnel and subjonctif are defined but not offered: enabling one later must be a one-line change.
- Setup: the offered tenses, all on by default, at least one on. The selection is per session and not persisted. Show the verb count.
- Pool: every word in the current language that has conjugations and isn't typed as a non-verb, so it grows automatically as I add verbs.
- Queue (a pure util, with injectable randomness so it can be tested):
  - 20 items per session, each a (verb, tense, person); sample with replacement if the pool is small;
  - never the same verb twice in a row, and spread tenses and persons;
  - a wrong answer re-inserts the item 3–5 positions later, at most twice per item;
  - progress counts against the original 20 and never exceeds it.
- Grading (pure, e.g. `src/utils/gradeConjugation.ts`):
  - Normalize: trim, lowercase, collapse spaces, unify ' and ’, strip trailing punctuation, and strip a leading subject pronoun if I typed one.
  - A match with any variant → correct.
  - A match after removing diacritics (NFD, plus œ→oe) → almost. It isn't re-queued, and the accent positions are highlighted.
  - Otherwise → wrong. Character-level diff against the canonical form, the full table for that tense with the asked row highlighted, and a note when useful (e.g. the être auxiliary).
- Input: autocapitalize off, autocorrect off, spellcheck off, enterkeyhint "done". Enter submits; Enter again goes to the next question. The input auto-focuses on each question so the phone keyboard stays open, and stays visible above the iOS keyboard.
- End screen: first-try score and the missed items. Empty state (no verbs) with a link to Families.

## Step 6 — Conjugation table in Families

A reusable table component (the same one the wrong-answer feedback uses), opened from a "Conjugate" pill on verb rows in the expanded family view, showing all offered tenses.

## Quality bar

- `npm run build`, `npm run lint` and `npm run format:check` pass.
- Add Vitest if it's small and clean, and unit-test the grading, queue building and verb-detection normalization. If you don't add it, tell me why.
- Click through: menu → drill → correct/almost/wrong → end screen → back. Multiple Choice works as before. With German selected, the drill is disabled and nothing else changes.
- The SRS scheduler, review_log and Multiple Choice logic stay untouched.

## Deliverables

1. The spike results first.
2. Logical commits on a feature branch.
3. `docs/practice-hub-spec.md` covering: what was built, the conjugations shape, how to add an exercise to the registry, how to enable a tense, and how German plugs in later ('de' in CONJUGATION_LANGUAGES + a German config + the german-verbs library, no UI changes).
4. The deploy steps I run myself: migration 016, deploying the functions, the backfill dry run, then the live backfill.
````

---

## 2A — Claude Design: Fill the Gap

````
Design the next exercise for the Practice hub in "Families" (repo: mnpont/families-app). The hub and the Conjugation Drill are already built. Read docs/practice-hub-spec.md, src/constants/exercises.ts, the Conjugation Drill components and src/styles/index.css, and reuse the existing components (menu button, prompt block, answer input, correct/almost/wrong feedback card, conjugation table, progress bar, end-of-session summary). Only design what's new. iPhone first, 390×844.

The exercise, **Fill the Gap**: a short French sentence with one verb blanked out and its infinitive in parentheses, e.g. "Hier soir, nous ______ au cinéma. (aller)", with the English translation in small muted text below. I type the missing form. **The tense isn't shown.** I have to infer it from context (that's the point). The tense is revealed after I answer.

Screens:
1. The Practice menu with the new "Fill the Gap" button added ("Complete the sentence with the right verb"), and its disabled "French only for now" state.
2. The question: how the sentence and blank are laid out (sentences can wrap to 2–3 lines), with the input visible above the iPhone keyboard.
3. Feedback in all three states, with the sentence completed in place. On wrong: the correct form, the revealed tense pill, a one-line "why" hint based on the context cue ("'Hier soir' → passé composé"), and the conjugation table.
4. The empty state: "Sentences are still being prepared for your verbs."

No setup screen: it starts directly. Deliver high-fidelity mockups and note which existing components are reused and which are new.
````

---

## 2B — Claude Code: Fill the Gap

````
Implement the **Fill the Gap** exercise in the Practice hub of this repo (mnpont/families-app). The Claude Design handoff is attached: it's the source of truth for visuals and copy, and this prompt defines behavior, data and logic. First read docs/practice-hub-spec.md, src/constants/exercises.ts, src/constants/conjugation.ts, the Conjugation Drill hook, utils and components, supabase/functions/_shared/generateSentence.ts and generateConjugations.ts, and migrations/README.md. Reuse the drill's grading normalizer, queue util and UI components instead of duplicating them.

What it is: a short French sentence with one verb blanked out, the infinitive in parentheses and the English translation shown. I type the missing form. The tense isn't shown, because I must infer it from context; it's revealed after answering.

Data and generation:
- Next migration: a table like `verb_gap_sentences(id, word_id → words on delete cascade, language_id, tense, person, sentence_with_blank, answer, translation_text, cue, created_at)`, with RLS following the existing policy migrations.
- Edge Function `generate-gap-sentences`, plus a batch backfill and a dry-run script. For each verb with conjugations and each **offered** tense in src/constants/conjugation.ts, generate 2 sentences with gpt-4o-mini (the existing OpenAI pattern, JSON mode). Each sentence needs:
  - a context cue that makes the tense unambiguous ("hier", "tous les jours", "la semaine dernière", "maintenant"…), returned as `cue`;
  - a person, varied across sentences;
  - A2–B1 level, under 14 words.
- **Mandatory validation:** store a sentence only if its answer matches an accepted form in that verb's `conjugations` for that tense and person (using the drill's normalizer). Retry once, then drop it silently. This keeps LLM mistakes out of the answer key.
- Fired and forgotten after a verb's conjugations are generated. No LLM calls at practice time.

Behavior:
- Pool: all stored sentences for the current language. The same session length, interleaving (no same verb twice in a row, mixed tenses), correct/almost/wrong grading and wrong-answer re-insertion as the drill. Free practice, no SRS.
- Wrong feedback: the correct form, a diff, the revealed tense, the cue-based "why" line, and the conjugation table.
- French only (the same availability rule as the drill). Add it to the exercise registry.
- An empty state when no sentences exist yet.

Quality bar: build, lint and format pass; unit tests for the new pure logic; a full click-through; Multiple Choice and the drill unaffected. Update docs/practice-hub-spec.md, and give me the deploy and backfill steps.
````

---

## 3A — Claude Design: Build the Sentence

````
Design the next exercise for the Practice hub in "Families" (repo: mnpont/families-app). Read docs/practice-hub-spec.md, src/constants/exercises.ts, the existing exercise components and src/styles/index.css. Reuse the existing menu button, progress bar, feedback colors and end-of-session summary; only design what's new. iPhone first, 390×844.

The exercise, **Build the Sentence**: word-order reconstruction. It trains sentence structure: French negation, pronoun and adjective placement; German verb-second and verb-final order. It works for **French and German**.
- Prompt: the English meaning of a sentence ("I don't eat meat anymore.").
- An answer line where tapped words land in order.
- Below it, shuffled word chips ("Je" "ne" "mange" "plus" "de" "viande."). Tapping a chip moves it to the answer line; tapping a word in the answer line sends it back.
- "Check" is enabled once all chips are placed.

Screens:
1. The Practice menu with the new "Build the Sentence" button ("Put the words in order").
2. The question with chips (wrapping over 2–3 lines on a 390px screen, each chip at least 44px tall), partially built, and fully built.
3. Correct and wrong feedback. Wrong shows the correct sentence with the misplaced words highlighted.

No typing and no keyboard. Deliver high-fidelity mockups, noting reused versus new components.
````

---

## 3B — Claude Code: Build the Sentence

````
Implement the **Build the Sentence** exercise in the Practice hub of this repo (mnpont/families-app). The Claude Design handoff is attached: it's the source of truth for visuals, and this prompt defines behavior and logic. First read docs/practice-hub-spec.md and src/constants/exercises.ts to see how exercises plug in, and reuse the shared progress bar, feedback and end-screen components.

What it is: word-order reconstruction. The prompt is the English translation of a stored example sentence; I tap shuffled word chips into the right order. It works for **every language, German included**, so it has no language restriction.

Data: **no new tables, no LLM calls.** It uses the existing `example_sentences` rows (text + translation_text) for words in the current language.

Rules:
- Tokenize on whitespace. Punctuation stays attached ("viande."), and elisions stay whole ("j'aime", "l'école").
- Only sentences with 4–12 tokens and a translation.
- The shuffled order must never equal the correct order.
- Duplicate words are separate chips; grade on the resulting text, so either duplicate works.
- Correct = the joined answer equals the original after normalizing whitespace and apostrophes. Exact order only; note in the spec that rare alternative valid orders count as wrong.
- Session: 10 sentences, interleaved across families, no repeats, the same progress and end screen. Free practice, no SRS.
- Add it to the exercise registry.

Quality bar: build, lint and format pass; unit tests for tokenizing, shuffling and grading; a click-through in both French and German; other exercises unaffected. Update docs/practice-hub-spec.md.
````
