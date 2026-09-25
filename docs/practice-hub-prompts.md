# Practice Hub — Prompts for Claude Design and Claude Code

Two prompts, used in order:

1. **Prompt A — Claude Design.** Paste it into Claude Design, attach the hand-drawn sketch of the Practice menu, and iterate on the mockups until you're happy. Export or screenshot the final screens.
2. **Prompt B — Claude Code.** Open a new Claude Code session on `mnpont/families-app`, attach the final mockups from step 1, and paste Prompt B (Phase 1). After Phase 1 is merged and you've used it for a while, start a fresh session for each of **Prompt B2 (Fill the Gap)** and **Prompt B3 (Build the Sentence)**.

Each prompt stands on its own, so none of them depends on the conversation that produced this file.

---

## Prompt A — Claude Design

````
I'm designing a new feature for "Families", a personal mobile-first web app I use to learn French and German vocabulary. I need you to design the screens for a new "Practice hub" and its first new exercise, a verb Conjugation Drill, plus two more exercises that will come later. I've attached a hand sketch of the Practice menu layout I want: please follow that structure.

## About the app (so the design fits in)

- Mobile-first PWA (used mostly on an iPhone, added to the home screen). Design at 390×844. It should also look fine on a desktop browser as a centered column (max content width ~420px).
- Visual style you MUST match:
  - White background with soft, blurred "golden hour" gradient orbs: a pink/peach orb (rgba(255,154,158) → rgba(250,208,196)) in the top-right, and a periwinkle/light-blue orb (rgba(142,158,255) → rgba(194,233,251)) in the bottom-left. Subtle, low opacity.
  - Primary accent: coral pink #FF9A9E.
  - Titles: "Playfair Display", bold (700), serif. The header title is the word "Families" in Playfair Display.
  - Everything else: "Inter" (400/500/600/700).
  - Cards and buttons: rounded (~13px radius), solid white or slightly frosted, thin soft borders; hover/focus borders tint toward the coral accent.
  - Existing multiple-choice answer rows are full-width rounded cards, min 48px tall, 14.5px semibold Inter text, turning green with a check icon when correct and red with an X icon when wrong.
  - Correct = green, wrong = red, and a new "almost right" state should be amber/yellow.
- Layout shell (unchanged, reuse it on every screen):
  - Header: small sync-status dot on the left, "Families" title centered. (Tapping the title reveals a language switcher: French / German. The language currently selected decides which language you practice.)
  - Bottom nav bar with 3 round icon buttons: Families (people icon), Flashcards (cards icon), Practice (pencil icon). The Practice tab is active on all screens in this brief.

## Screen 1 — Practice menu (the hub)

What you see when tapping the pencil icon. Follow my sketch: a vertical stack of large, tappable exercise buttons, one per exercise type, in this order:

1. **Multiple Choice** — the existing exercise: see a word, pick its translation from 4 options.
2. **Conjugation Drill** — NEW (built first).
3. **Fill the Gap** — coming later.
4. **Build the Sentence** — coming later.

Design notes:
- Each button: exercise name (bold), a one-line description underneath in muted text, and optionally a small icon. Examples: "Pick the right translation" / "Type the right verb form" / "Complete the sentence with the right verb" / "Put the words in order".
- Exercises that aren't built yet appear as disabled/greyed with a small "Coming soon" tag. Design both the enabled and the disabled look.
- If an exercise isn't available for the currently selected language (e.g. Conjugation Drill while German is selected), show it disabled with a tag like "French only for now".
- The list must be easy to extend: more exercise types will be added later, so it must work with 5–8 buttons (scrolls if needed).
- Optional, nice to have: a small count on a button, e.g. "18 verbs" on Conjugation Drill or "12 due" on Multiple Choice.

## Screen 2 — Conjugation Drill: session setup (small bottom sheet or compact screen)

Opens when tapping "Conjugation Drill".
- Title "Conjugation Drill" and a one-line explainer: "Type the correct form of your saved verbs."
- A row of tense chips the user can toggle on/off for this session. For French right now: "Présent" and "Passé composé", both on by default. At least one must stay on. The design must work with up to ~6 chips (more tenses will be added later, e.g. Imparfait, Futur simple).
- Info line: "18 verbs · 20 questions".
- Big primary "Start" button (coral).
- A way to close/go back to the menu.

## Screen 3 — Conjugation Drill: question

- Top: back/close control (returns to the Practice menu) and a progress bar with a "7/20" label (the existing Multiple Choice exercise already has a thin progress bar with a label on the right; reuse that look).
- Center, large: the prompt, made of three pieces:
  - the subject pronoun, e.g. "nous" (or "j'" / "je", "tu", "il", "elle", "nous", "vous", "ils", "elles"),
  - the infinitive, e.g. "aller", visually emphasized,
  - the tense label as a small pill, e.g. "Passé composé".
  - Also show the verb's English meaning in small muted text, e.g. "to go".
- A single text input ("Type the verb form…") with a "Check" button. The user types only what comes after the pronoun (e.g. "sommes allés"). Pressing Enter on the phone keyboard also submits. No accent/special-character buttons: the user uses their own keyboard.
- The input must stay visible above the iPhone keyboard. Design the layout with the keyboard open.

## Screen 4 — Conjugation Drill: feedback (3 states on the same card)

After "Check", the input locks and one of three states shows. A "Next" button (or "Continue", Enter also works) moves on:

1. **Correct** (green): the user's answer with a check mark. Brief and positive. This state is so light it could even auto-advance.
2. **Almost** (amber): the only mistakes were accents (e.g. typed "etes" for "êtes"). Show "Almost — watch the accents", the correct form with the accented letters highlighted, and the user's version below it.
3. **Wrong** (red): the user's answer struck through or dimmed, the correct form below it with the differing letters highlighted, AND a compact conjugation table for that verb + tense (6–8 rows: pronoun | form), with the asked-for row highlighted. Example for aller, passé composé:
   - je suis allé(e) · tu es allé(e) · il est allé · elle est allée · nous sommes allé(e)s · vous êtes allé(e)(s) · ils sont allés · elles sont allées.
   - The table must be readable at a glance, not a wall of text.
   - A short note line when relevant, e.g. "aller uses être in the passé composé".

## Screen 5 — Conjugation Drill: end of session

- A score summary, e.g. "17 / 20 on the first try".
- A list of the forms that were missed ("nous · aller · passé composé → sommes allés"), so the user can glance at them.
- Buttons: "Practice again" (primary) and "Back to Practice" (secondary).

## Screen 6 — Empty and edge states

- No verbs saved in this language: "No verbs yet. Add verbs in Families and they'll show up here automatically." with a button that goes to Families.
- Loading state (simple, matches the app's existing minimal "Loading..." empty state).

## Screen 7 — Conjugation table from the word list (small, secondary)

In the Families tab, a family expands into a list of words (each row: the word and its translation). Verb rows get a small "Conjugate" pill/icon. Tapping it opens a modal showing the full conjugation tables for that verb: one section per available tense (Présent, Passé composé), same table style as in Screen 4. It has a close button. This lets the user study a verb before being tested on it.

## Screens 8–9 — Future exercises (design them now so the system stays consistent, lower fidelity is fine)

**Fill the Gap** (question + feedback):
- A short French sentence with a blank where a verb goes, and the infinitive in parentheses. Example: "Hier soir, nous ______ au cinéma. (aller)"
- The English translation of the sentence in small muted text below.
- The tense is NOT shown. The user has to infer it from context ("Hier soir" → passé composé). After answering, reveal the tense pill.
- Same text input, the same 3 feedback states (correct / almost / wrong) and the same progress bar and end-of-session screen as the Conjugation Drill.

**Build the Sentence** (question + feedback):
- Top: the English meaning of a sentence as the prompt, e.g. "I don't eat meat anymore."
- Middle: an answer line/area where tapped words land in order.
- Bottom: shuffled word chips (e.g. "Je" "ne" "mange" "plus" "de" "viande.") Tapping a chip moves it to the answer line. Tapping a word in the answer line sends it back.
- A "Check" button, enabled once all chips are placed.
- Feedback: correct (green) or wrong (red, show the correct sentence).
- Chips must wrap across lines and stay comfortably tappable (≥44px tall).

## Deliverables

- High-fidelity mobile mockups for Screens 1–7, lower fidelity OK for 8–9.
- One consistent component set: exercise menu button (enabled / disabled / "coming soon"), tense chip (on/off), prompt block, answer input, feedback card (correct / almost / wrong), conjugation table, progress bar, end-of-session summary, word chip.
- Keep it calm, clean and uncluttered. This is a focused study tool, not a game: no mascots, confetti, streak flames or points.
````

---

## Prompt B — Claude Code, Phase 1: Practice hub + Conjugation Drill

````
I want you to implement a new feature in this repo (mnpont/families-app): a **Practice hub** (menu of exercise types behind the pencil tab) and its first new exercise, a **Conjugation Drill** for French verbs. I've attached mockups made in Claude Design. Follow them for visuals and layout. Where this prompt and the mockups disagree about behavior, this prompt wins.

Read these first to learn the codebase and its conventions: README.md, docs/v2-plan.md, docs/phase2-exercise-methods.md, docs/practice-mc-spec.md, migrations/README.md, supabase/functions/README.md, src/App.tsx, src/components/PracticeView.tsx, src/hooks/usePracticeSession.ts, src/hooks/useReviewSession.ts, src/lib/vocabularyApi.ts, supabase/functions/_shared/generateSentence.ts, supabase/functions/generate-example-sentence/index.ts, supabase/functions/batch-generate-sentences/index.ts. Match the existing code style: comment density and "why" comments, naming, hooks-per-feature structure, one CSS file (src/styles/index.css), numbered SQL migrations, fire-and-forget background Edge Function calls.

## Background and product decisions (already made — don't re-litigate)

- I'm an intermediate learner of French. I know the **présent** and **passé composé** fully. German is my stronger language (I know more tenses), but **this phase is French only**. German comes later as a separate phase once French is polished. Nothing here should break German: the app must work exactly as today when German is selected.
- Research-backed principles this feature is built on:
  - **production over recognition**: the user types forms and never picks them from options;
  - **retrieval practice**;
  - **interleaving**: mix verbs, persons and tenses within a session, never blocked by verb;
  - **immediate explicit corrective feedback**: show the correct form, the differing letters and the full paradigm after a miss.
- **Simplest scheduling: free practice, no spaced repetition for conjugation in this phase.** No new schedule-state table and no review_log writes for the drill. Within a session, a missed item comes back a few questions later. The existing Multiple Choice exercise keeps its current SRS behavior untouched.
- **Auto-grading** (no Again/Hard/Good/Easy buttons in the drill). Three outcomes: correct / almost (accent-only mistakes) / wrong.
- **No accent/special-character buttons.** The user types with their own phone keyboard.
- **Correct forms come from a rule-based conjugation library, not an LLM**, with an LLM fallback only if the library route proves unworkable (see "Step 1 — spike").

## Important existing-behavior fact

Today `words.part_of_speech` is ONLY set when the user manually picks a word type in Add/Edit Word (see AddWordModal / EditWordModal / vocabularyApi.addWord). Nothing sets it automatically, and many of my verbs were saved without it. So the drill must NOT rely only on part_of_speech = 'verb'. Verb detection must be automatic (see Step 3).

## Step 1 — Spike: verify the conjugation library (do this first, report before building on it)

Candidate libraries (from the RosaeNLG project): `french-verbs` + `french-verbs-lefff` (French conjugations from the Lefff lexicon). For later German: `german-verbs` + `german-verbs-dict`. Verify, and tell me the results briefly before moving on:
1. They can run inside a Supabase Edge Function (Deno, `npm:` specifiers), within Edge Function size and memory limits. The Lefff dictionary is large, so measure it.
2. They produce correct présent and passé composé forms. That includes:
   - choosing the auxiliary (être vs avoir);
   - past-participle agreement for être verbs (elle est allée, ils sont allés, elles sont allées);
   - pronominal verbs ("se lever": je me lève, je me suis levé(e));
   - common irregulars: être, avoir, aller, faire, pouvoir, vouloir, devoir, savoir, venir, prendre, dire, voir, mettre, tenir.
   Spot-check at least 15 verbs against a trusted reference, and include a few -er verbs with spelling changes (manger → nous mangeons, commencer → nous commençons, appeler → j'appelle, acheter → j'achète).
3. Their licenses are compatible with a personal/open project. Tell me what they are.

If the library can't run in an Edge Function, try the next option: run it in a Node script (scripts/, like scripts/backfillWordGender.ts) plus client-side-safe generation. Only if the library is unusable, fall back to LLM generation (gpt-4o-mini via the existing OpenAI pattern in supabase/functions/_shared/), with a strict JSON schema. Tell me which route you took and why.

## Step 2 — Data model (migration 016)

- `migrations/016_add_words_conjugations.sql`: add a nullable `conjugations jsonb` column to `words`. Document it in migrations/README.md like the others.
- Store every tense the library supports for that verb (not only présent/passé composé), so enabling more tenses later needs no regeneration.
- Suggested shape (adjust if the library suggests something better, and document the final shape in the migration comment and a TS type in src/types/):
  `{ "version": 1, "source": "lefff" | "llm", "infinitive": "aller", "pronominal": false, "auxiliary": "etre", "tenses": { "present": { "je": "vais", "tu": "vas", "il": "va", "elle": "va", "nous": "allons", "vous": "allez", "ils": "vont", "elles": "vont" }, "passe_compose": { "je": ["suis allé", "suis allée"], ..., "elle": ["est allée"], "ils": ["sont allés"], "elles": ["sont allées"], "nous": ["sommes allés", "sommes allées"], "vous": ["êtes allé", "êtes allée", "êtes allés", "êtes allées"] }, ... } }`
  - Each person holds either one string or an array of all accepted variants. The first variant is the canonical display form.
  - Include "je" elision info (j'ai / j'aime vs je suis / je vais) so the UI shows "j'" correctly: either store the display subject per person, or compute it from the answer's first letter (vowel or mute h), your call. Document it.
  - For pronominal verbs, the stored answer includes the reflexive pronoun (me lève, me suis levé), because the user types everything after the subject pronoun.
- Update VocabWord / ReviewCard types and the select strings in vocabularyApi.ts so `conjugations` is loaded with the vocabulary.

## Step 3 — Generation and automatic verb detection

New Edge Function `generate-conjugations` (logic in `supabase/functions/_shared/generateConjugations.ts`, mirroring generateSentence.ts), plus `batch-generate-conjugations` for backfill, mirroring batch-generate-sentences.
- Triggered fire-and-forget after a word is added AND after a word is edited (text or type changed), in the same style as the existing `generate-example-sentence` / `generate-distractors` invocations in vocabularyApi.ts. It must never block or slow down adding a word.
- Only for supported languages. For now a single constant, `CONJUGATION_LANGUAGES = ['fr']`. Anything else is a no-op.
- Detection logic:
  1. If part_of_speech is set to something other than 'verb' (noun, adjective, phrase, other): skip. The user explicitly said it isn't a verb.
  2. Normalize the text: trim and lowercase; strip a leading "se " / "s'" and remember that it's pronominal. If the text starts with an article (le, la, l', les, un, une, des), it isn't a verb: skip.
  3. If the infinitive exists in the conjugation dictionary: store `conjugations`, and if part_of_speech is null, set it to 'verb'. (That's the "automatic" part: I don't have to remember to pick the type.)
  4. If not found: leave the word untouched. If part_of_speech was manually 'verb' but the dictionary doesn't know it, log it. Don't fail loudly.
- If the user later edits the word's type away from 'verb', clear `conjugations` (or ignore it in the drill). Pick one approach and keep it consistent.
- Known limitation to accept: a word saved without an article that happens to be an infinitive (e.g. "dîner") gets tagged as a verb. That's fine; I can change it in Edit Word.
- Backfill: a way to run conjugation generation over all existing French words (the batch function, and/or a `scripts/backfillConjugations.ts` + npm scripts `backfill:conjugations-dry-run` / `backfill:conjugations-live`, following the gender backfill pattern). The dry run must print which words would be tagged as verbs so I can check it.

## Step 4 — Practice hub (menu)

- The pencil tab now opens a **menu** (per the mockup and my sketch) instead of going straight into Multiple Choice.
- Buttons: **Multiple Choice** (the existing PracticeView, behavior completely unchanged), **Conjugation Drill** (new), **Fill the Gap** (disabled, "Coming soon"), **Build the Sentence** (disabled, "Coming soon").
- Define the exercise list as data, in one small registry, e.g. `src/constants/exercises.ts`, with: id, name, description, component, `isAvailable(languageId)` and an unavailable reason. That way adding an exercise later is one entry plus its component. The Conjugation Drill is unavailable for languages not in CONJUGATION_LANGUAGES ("French only for now").
- Navigation: tapping an exercise opens it full-screen within the Practice tab. Each exercise has a back/close control that returns to the menu. Tapping the pencil nav icon while inside an exercise also returns to the menu. Switching language returns to the menu. Keep this as simple state in App/Practice (e.g. `practiceExercise: ExerciseId | null`). No router library.
- The header stays as it is today (the + button only shows on the Families tab).

## Step 5 — Conjugation Drill

Config: `src/constants/conjugation.ts`, per language:
- persons to ask and their display labels (French: je/j', tu, il, elle, nous, vous, ils, elles);
- tenses: key, display label, and whether each is offered. French now: présent and passé composé offered. Imparfait, futur simple, conditionnel and subjonctif are defined but not offered yet. Enabling a tense later must be a one-line change.

Setup: tense chips (offered tenses, all on by default, at least one must stay on; the selection isn't persisted, it's per session), plus a "Start" button. Show the number of available verbs.

Verb pool: all words in the current language that have `conjugations` and aren't typed as a non-verb. This updates automatically as I add verbs.

Session building (`src/hooks/useConjugationDrill.ts` + a pure util for building the queue):
- Session length: 20 questions (a constant). If the pool is smaller, sample with replacement across verb × tense × person.
- An item = (verb, tense, person). Interleave: never the same verb twice in a row, and spread tenses and persons. Use randomness, but seedable or injectable so it can be unit-tested.
- A **wrong** answer (not "almost") re-inserts the same item 3–5 positions later, at most twice per item. Progress is measured against the original 20 (the same "never show 5/4" rule as PracticeView).

Grading (pure function, e.g. `src/utils/gradeConjugation.ts`):
- Normalize both sides: trim, lowercase, collapse internal whitespace, unify apostrophes (' vs ’), strip trailing punctuation.
- Exact match with any accepted variant → **correct**.
- Match after removing diacritics (NFD + strip combining marks, also œ→oe) → **almost**. Counts as answered, not re-queued. Shows the accented form with the accent positions highlighted.
- Otherwise → **wrong**. Shows the correct canonical form with a simple character-level diff against the user's answer, plus the full table for that verb and tense with the asked row highlighted, plus a note when relevant (e.g. "aller uses être in the passé composé").
- If the user typed the subject pronoun too ("nous allons"), strip a leading matching pronoun before grading and accept it.

UI:
- Prompt: subject + infinitive (emphasized) + tense pill + English meaning (the word's primary translation).
- Text input: `autocapitalize="off" autocorrect="off" spellcheck={false}` and `enterkeyhint="done"`. Enter submits, and Enter again goes to the next question. Auto-focus the input on each new question so the phone keyboard stays up. Make sure the input and feedback stay visible above the iOS keyboard.
- Correct: brief green state, then Next (you may auto-advance after ~700ms on correct, your call, but be consistent).
- End screen: first-try score, the list of missed items, "Practice again" and "Back to Practice".
- Empty state when no verbs have conjugations, with a button that goes to the Families tab.

## Step 6 — Conjugation table in Families (small)

A reusable `ConjugationTable` component (also used by the drill's wrong-answer feedback). In the expanded family view, words with `conjugations` get a small "Conjugate" pill that opens a modal with the tables for all offered tenses.

## Quality bar

- `npm run build`, `npm run lint` and `npm run format:check` must pass.
- The repo doesn't have a test runner yet. If adding Vitest is small and clean, add it and unit-test the pure logic: grading (correct/almost/wrong, apostrophes, pronoun stripping, variants), queue building (interleaving, re-insertion cap) and verb detection/normalization (articles, "se "/"s'"). If you decide against adding a test runner, tell me why.
- Run the app and click through: menu → drill → correct/almost/wrong → end screen → back; Multiple Choice still works exactly as before; German selected → drill disabled, nothing else changes.
- Don't touch the existing SRS scheduler, review_log or the Multiple Choice logic, except for mounting PracticeView inside the new menu.
- Keep secrets out of the code. Edge Functions use the existing env var pattern.

## Deliverables

1. The spike results (Step 1) before the rest.
2. The implementation on a feature branch, committed in logical commits.
3. A short doc, `docs/practice-hub-spec.md`: what was built, the conjugations JSON shape, how to add a new exercise to the registry, how to enable a new tense, and how German will plug in later (add 'de' to CONJUGATION_LANGUAGES, a German config with its persons and tenses, and the german-verbs library in the generator: no UI changes).
4. The exact deploy steps I have to run myself: apply migration 016, deploy the new Edge Functions, run the backfill dry run, check the output, then run it live.
````

---

## Prompt B2 — Claude Code, Phase 2: Fill the Gap (start in a fresh session after Phase 1 is merged)

````
In mnpont/families-app, implement the **Fill the Gap** exercise in the Practice hub. The hub and the Conjugation Drill already exist (see docs/practice-hub-spec.md). Read that spec, src/constants/exercises.ts, src/constants/conjugation.ts, the Conjugation Drill hook/components/utils, supabase/functions/_shared/generateSentence.ts and generateConjugations.ts, and migrations/README.md before starting. Visuals: follow the attached Claude Design mockup for Fill the Gap and reuse the Conjugation Drill's components (input, feedback card, progress bar, end screen).

What it is: a short sentence in the target language with one verb blanked out, and the infinitive in parentheses, e.g. "Hier soir, nous ______ au cinéma. (aller)", with the sentence's English translation below. The user types the missing form. **The tense is NOT shown. The user must infer it from context** (this is the point: choosing the tense from meaning, not just producing a given form). Reveal the tense pill after answering.

Content generation:
- New table (migration 017), e.g. `verb_gap_sentences(id, word_id → words on delete cascade, language_id, tense, person, sentence_with_blank, answer, translation_text, created_at)`, with RLS policies following migration 008/011's pattern.
- New Edge Function `generate-gap-sentences` (+ batch backfill). For each verb with `conjugations`, and each tense currently *offered* in src/constants/conjugation.ts (présent, passé composé), generate 2 sentences per tense with gpt-4o-mini (same OpenAI pattern as generateSentence.ts, JSON mode). Each sentence must contain a clear context cue that makes the tense unambiguous (time expressions such as "hier", "tous les jours", "d'habitude", "la semaine dernière", "maintenant"), use varied persons, be A2–B1 level and stay under 14 words.
- **Validation is mandatory**: the LLM returns the sentence with the answer marked, and the person it used. Only store it if the marked answer matches one of the accepted forms in that verb's `conjugations` for that tense and person (use the Conjugation Drill's grading normalizer). Discard and retry once otherwise, then give up silently. This is what keeps LLM mistakes out of the answer key.
- Triggered fire-and-forget after conjugations are generated for a verb, plus the backfill function/script with a dry run.

Exercise behavior:
- Pool: all stored gap sentences for verbs in the current language. The same session length and interleaving rules as the drill (no same verb twice in a row, mix tenses), and the same correct/almost/wrong grading and wrong-answer re-insertion. On wrong: show the correct form, the diff, the tense, and a short "why" line built from the context cue if the LLM supplied it (store an optional `cue` field). No LLM calls at practice time.
- French only (same availability rule as the drill). Enable the button in the exercise registry.
- Empty state when no sentences have been generated yet.

Quality bar: build/lint/format pass, unit tests for any new pure logic, click-through of the whole flow, Multiple Choice and the Conjugation Drill unaffected. Update docs/practice-hub-spec.md and give me the exact deploy/backfill steps.
````

---

## Prompt B3 — Claude Code, Phase 3: Build the Sentence (start in a fresh session)

````
In mnpont/families-app, implement the **Build the Sentence** exercise in the Practice hub (see docs/practice-hub-spec.md and src/constants/exercises.ts for how exercises plug in). Follow the attached Claude Design mockup.

What it is: word-order reconstruction. It targets sentence structure (French negation ne…pas/plus, object-pronoun placement, adjective placement; German verb-second and verb-final order). The prompt is the English translation of a stored example sentence. Below it, the sentence's words appear as shuffled chips. Tapping a chip appends it to the answer line, and tapping a word in the answer line returns it to the pool. "Check" is enabled once all chips are placed.

Data: **no new tables, no LLM calls.** Use the existing `example_sentences` rows (text + translation_text) for words in the current language. This exercise works for **every language, German included**. It has no French-only restriction.

Rules:
- Tokenize on whitespace. Keep punctuation attached to its word ("viande."). Keep elisions as one token ("j'aime", "l'école").
- Use only sentences with 4–12 tokens and a non-empty translation.
- Shuffle so the chip order never equals the correct order.
- Duplicate words (e.g. two "de") are separate chips. Grade by resulting text, not chip identity, so either duplicate works.
- Correct = the joined answer equals the original sentence after normalizing whitespace and apostrophes. Exact order only; accept that rare alternative valid orders count as wrong (a known limitation, noted in the spec).
- Wrong: show the correct sentence, with the misplaced words highlighted.
- Session: 10 sentences, interleaved across families, no repeats within a session, and the same progress bar and end screen as the other exercises. Free practice, no SRS.
- Chips must be at least 44px tall and wrap across lines on a 390px-wide screen.

Quality bar: build/lint/format pass, unit tests for tokenization/shuffle/grading, a click-through in both French and German, no other exercise affected. Update docs/practice-hub-spec.md.
````
