# Learning Science for Vocabulary Acquisition — Research & App Evaluation

Prepared for the v2 redesign of the family vocabulary app (currently German-only, single-file React app in `index.html`). Goal: ground the redesign in evidence-based second-language vocabulary acquisition research before adding multi-language support and "smarter" learning features.

---

## Part 1 — Research: Evidence-Based Vocabulary Acquisition

### 1.1 Spaced repetition algorithms

Spaced repetition exploits the **spacing effect**: information reviewed at increasing intervals, timed just before it would be forgotten, is retained far more durably than information crammed or reviewed at fixed/short intervals. Three algorithm families are relevant:

**Leitner system (1970s, Sebastian Leitner)**
- Cards live in boxes (typically 3-5). Correct answer → card moves up a box (reviewed less often); wrong answer → card drops back to box 1 (reviewed daily).
- Box review intervals roughly double: box 1 = daily, box 2 = every 2 days, box 3 = every 4 days, etc.
- Simplest to implement — just needs a box number per card and a "due date" derived from box + last review date.
- Weakness: coarse-grained, doesn't adapt to individual item difficulty beyond box position, and doesn't account for how *strong* a "correct" answer was (a hesitant correct answer is treated the same as a confident one).

**SM-2 (1987, Piotr Woźniak / SuperMemo, used by Anki historically)**
- Per-card state: an *ease factor* (EF, starts at 2.5) and an *interval* (days until next review).
- After each review, the learner grades recall quality (0-5 in the original algorithm; simplified to "Again/Hard/Good/Easy" in most modern apps).
- If recall succeeds, interval grows by roughly `interval × EF`; if it fails, interval resets to 1 day and EF is nudged down.
- Known flaw: EF only ratchets downward easily and recovers slowly — a card marked "hard" a few times gets an EF near the floor (1.3) and then keeps reappearing at short intervals indefinitely, regardless of later successes.
- Still the most implemented algorithm because it is a handful of arithmetic operations with no training data required.

**FSRS — Free Spaced Repetition Scheduler (2022, open source, now Anki's default since v23.10)**
- Models each card with three variables: **Difficulty** (1-10, how hard this item is for this learner), **Stability** (days until recall probability decays to a target retention, e.g. 90%), and **Retrievability** (predicted probability of recall *right now*, which decays over time per a forgetting-curve function).
- Uses a small parametric model (originally fit via machine learning on ~700M+ Anki reviews) that can also be *personalized* by fitting the 17-ish free parameters to a given user's own review history once enough data exists.
- Schedules the next review at the point where predicted retrievability drops to the desired target (commonly 90%), rather than using a fixed multiplier.
- Benchmarks (Anki's own FSRS vs SM-2 comparisons across large review datasets) show FSRS needs roughly **20-30% fewer reviews for the same retention**, because it stops over-reviewing easy cards and under-reviewing hard ones.
- Tradeoff: meaningfully more complex to implement correctly (differential equations for stability decay, parameter fitting, cold-start behavior with little data) and it wants a reasonably large review history per user to shine. A full from-scratch open-source implementation exists (`fsrs4anki`, `py-fsrs`, `ts-fsrs`) which lowers the bar.

**"FSRS-lite" practical middle ground**: several simplified spaced-repetition apps take the FSRS *state model* (difficulty/stability/retrievability, or just difficulty + interval) but use a fixed formula rather than the full trained weight set — giving most of FSRS's adaptivity (bigger jumps for easy items, shorter loops for hard ones, explicit target retention) without needing a trained model or large per-user datasets. This is the pragmatic recommendation for a small personal app (see Part 3).

### 1.2 Active recall vs. passive review — the testing effect

Actively retrieving an answer from memory (attempting to recall before seeing the answer) produces substantially better long-term retention than passively re-reading or re-viewing the same material — this is the well-replicated **testing effect** (Roediger & Karpicke, and decades of follow-up work). The act of retrieval itself strengthens the memory trace, independent of feedback. Passive flashcard flipping *can* leverage this if the learner genuinely tries to recall before flipping, but apps that make it too easy to "peek" or move on without attempting a real answer forfeit most of the benefit — the learning value comes from the retrieval attempt, not from seeing the card.

### 1.3 Interleaving vs. blocked practice

Blocked practice (all instances of one type in a row — e.g., all animal words, then all food words) produces excellent performance *during* practice but weaker long-term retention. Interleaved practice (mixing item types, categories, or even languages within a session) is more effortful and produces *worse* performance during study, but reliably yields better long-term retention and better transfer — because the learner must actively discriminate between items and retrieve the correct rule/answer each time rather than pattern-matching on "we've been doing colors for the last ten cards." This is one of the most robust and counter-intuitive findings in the learning literature: the format that "feels" better while studying is often the format that teaches worse.

### 1.4 Desirable difficulty (Bjork)

Robert Bjork's framework: conditions that make learning feel slower or harder in the moment (spacing, interleaving, generation/retrieval, varying context) often produce superior long-term retention and transfer, precisely because they demand more effortful, reconstructive processing rather than passive/effortless processing. The corollary is that conditions that make performance look good in the short term (massed practice, blocking, being shown the answer) are frequently *undesirable* difficulties in disguise — they inflate the learner's confidence without building durable memory. Design implication: a good vocabulary app should sometimes feel harder than a naive one, because that's a feature, not a bug.

### 1.5 Contextual / sentence-based learning vs. isolated word lists

Vocabulary learned in a meaningful sentence or phrase context is retained better and generalizes better to real usage than vocabulary learned as isolated word-translation pairs, for several converging reasons:
- Context provides retrieval cues (semantic, syntactic) that a bare word pair lacks.
- It surfaces real usage patterns — gender/case agreement, collocations, register — that a word list obscures.
- It reduces reliance on rote L1↔L2 mapping in favor of building a mental model of how the word is actually used.
This doesn't mean isolated word pairs are useless (they're a fine and fast first exposure), but a system that layers example sentences on top of raw word pairs, and ideally *tests* using cloze-in-context rather than bare word→translation, aligns much better with the evidence.

### 1.6 Production vs. recognition tasks

Recognition tasks (multiple choice, "pick the right translation") are easier and lower-friction, but recall/production tasks (typing the translation, filling in a blank) demand a stronger memory trace to succeed and produce better retention — a specific case of the testing-effect / retrieval-effort principle above. Recognition is a reasonable *early* stage for brand-new words (reduces frustration, builds initial familiarity) but a mature review system should graduate words toward production-mode testing as they're learned, since recognition-only practice systematically overestimates what a learner can actually produce (e.g., in conversation).

### 1.7 Confidence-based self-rating / metacognition

Systems that ask the learner to self-rate confidence or recall quality (e.g., Anki's Again/Hard/Good/Easy, or a 1-5 confidence scale) serve two purposes: (1) they feed the scheduling algorithm real difficulty signal per item, which is what lets SM-2/FSRS-style algorithms personalize intervals instead of using one-size-fits-all timing; and (2) the act of self-assessment is itself a metacognitive exercise that research links to better calibration and self-regulated study (learners get better at knowing what they don't know). The self-rating needs to happen *after* an honest retrieval attempt, not before — rating confidence before trying to recall doesn't carry the same benefit.

---

## Part 2 — Current App Evaluation

Reviewed directly from the repo (`/home/user/families-app/index.html`, a single-file React app with no build step and no external state beyond `localStorage`).

### What exists today

- **Data model**: words have `id`, `german`, `english`, `family` (a user-defined category), `dateAdded`, and optionally `exampleSentenceDe` / `exampleSentenceEn` (fields exist and are shown in the word list view — `word.exampleSentenceDe`/`exampleSentenceEn`, around line 3863 — but are not used anywhere in the review/flashcard flow itself).
- **Review mechanism**: a single "Flashcards" view (`view === 'flashcards'`). Words are shuffled once on entering the view (`shuffleArray(words)`, ~line 1152) and stepped through with next/prev buttons and a flip animation. There is no re-shuffle logic tied to correctness, no session end state, and no distinction between new/learning/mastered words.
- **Interaction model**: tap to flip (front = German, back = English), then manually advance. That's it — no "did you get it right" input at all.
- **Categorization**: words are grouped into user-defined "families" (categories) purely for organizing/browsing, not for spaced scheduling or interleaving logic.

### Gap analysis against the research in Part 1

| Research-backed practice | Present in current app? |
|---|---|
| Spaced repetition (Leitner/SM-2/FSRS) | **No.** No due dates, no interval state, no per-word scheduling of any kind. Every session shows all words shuffled randomly regardless of how recently or successfully they were reviewed. |
| Active recall / testing effect | **Partial, weak.** The flip-to-reveal mechanic *can* support recall if the learner tries to answer before flipping, but nothing in the UI prompts or requires an answer attempt — there's no distinction from just reading both sides. No production step exists at all. |
| Interleaving vs. blocking | **Accidental only.** Shuffling all words together does interleave families, but this is incidental (a UX choice, not a scheduling one) — it has no relationship to spaced review, difficulty, or per-word history. |
| Desirable difficulty | **Not addressed.** There's no mechanism to make review harder for well-known words or easier for new ones — every word gets identical treatment every session. |
| Contextual/sentence-based learning | **Data exists, unused in review.** Example sentences are stored and shown in the static word-list/edit view, but the flashcard review flow only shows the bare German/English pair — the contextual data is invisible during actual practice, which is where it would matter most. |
| Production vs. recognition | **Neither, really.** There's no quiz/typing input and no multiple-choice; the flashcard is pure recognition-by-exposure (you see the answer by flipping, you don't have to produce or select it). |
| Confidence-based self-rating | **Absent.** No correct/incorrect/confidence input exists anywhere, so there is no signal available to drive any future scheduling logic. |

### Bottom line

The current app is a **plain digital flashcard flipper**: good word-storage/CRUD and family/category organization, a serviceable UI, and even latent example-sentence data — but it implements essentially none of the retrieval-and-scheduling mechanics that the vocabulary-acquisition literature identifies as the actual drivers of retention. It's closer to a "read the list repeatedly" tool than a spaced-repetition learning tool. This is a strong starting point for CRUD/data and UI, and a near-blank slate for the learning-science layer — which is good news for a v2, since the gap to close is well-defined rather than requiring a rebuild of the whole app.

---

## Part 3 — Proposed Features for v2 (Prioritized)

Prioritization axis: **learning-science impact** vs. **implementation complexity** for a small, personally-maintained family app (no ML infra, no backend beyond what already exists, single dev/family maintaining it).

### Tier 1 — High impact, low/medium complexity (do these first)

1. **Spaced review scheduling — recommend a simplified SM-2 (or "FSRS-lite" state model), not full FSRS.**
   Add per-word state: `interval` (days), `easeFactor` (or a simplified difficulty score), `dueDate`, `reviewCount`. After each review, grade Again/Hard/Good/Easy (4-button, same UX pattern Anki popularized) and adjust interval/ease with SM-2-style rules, capping ease-factor decay so cards don't get permanently stuck (fixing SM-2's known flaw). Only surface words whose `dueDate <= today` (plus a capped number of new words) in a review session. This is the single highest-leverage change — everything else in the app is currently undermined by reviewing all words with equal, non-adaptive frequency. Complexity: moderate — a few numeric fields per word and a scheduling function, no external libraries required. A full FSRS implementation (`ts-fsrs` exists as a JS library) could be a stretch goal once there's enough per-user review history to make its extra sophistication pay off, but SM-2-style scheduling delivers most of the benefit for far less complexity and no cold-start problem.

2. **Confidence-based self-rating after each review.**
   Replace/extend the "flip and move on" gesture with an explicit Again/Hard/Good/Easy (or simpler Wrong/Right/Easy) input after the learner attempts recall. This is required input for #1's scheduler anyway, and independently supports the metacognitive benefits described in 1.7. Complexity: low — a button row, no new data model beyond what #1 needs.

3. **Production-mode quizzing (typing the answer) as a review mode alongside flashcards.**
   Add a mode where the learner types the German (or target-language) word instead of flipping a card, with reasonably fuzzy matching (accent/case-insensitive, allow minor typos) so the app doesn't unfairly penalize near-misses. Keep flip-flashcards for first exposure to brand-new words, then graduate to production mode as a word's `reviewCount`/interval grows. Complexity: low-medium — a text input, a lenient string-comparison function, and a rule for which mode to show based on word maturity.

4. **Contextual example sentences surfaced *during* review, not just in the word list.**
   The data already exists (`exampleSentenceDe`/`exampleSentenceEn`) — it's just not shown in the flashcard/review UI. Show the example sentence on the answer side of the card (or as a cloze/fill-in-the-blank using the sentence with the target word blanked out — see #5). Complexity: very low, since the fields already exist; this is mostly a UI wiring gap, not new data work.

### Tier 2 — High impact, higher complexity (worth doing, but sequence after Tier 1)

5. **Cloze-style fill-in-the-blank recall using the stored example sentences.**
   Where an example sentence exists, generate a review item that blanks the target word out of its own example sentence and asks the learner to produce it — combining contextual learning (1.5) with production (1.6) in one exercise type. Requires a modest UI (blank rendering, answer input) and depends on enough words having example sentences populated; may need a lightweight sentence-authoring workflow (or an LLM-assisted one-time batch generation step for existing words lacking sentences) since hand-writing example sentences for every word is the real cost here.

6. **Interleaved multi-language review sessions** (relevant once multi-language support lands).
   Rather than reviewing one language's due words in a block, mix due words across all the learner's active languages/families in a single session, deliberately (not incidentally, as today's shuffle does). This directly operationalizes 1.3/1.4 — it will feel slightly harder session-to-session, which is the point. Complexity: low once #1's scheduler exists (it's a query/sort change: pull due words across languages and shuffle, rather than shuffling within one language) — but it's sequenced after multi-language support and after spaced scheduling, since it depends on both.

### Tier 3 — Nice-to-have / longer-horizon

7. **Full FSRS adoption once there's enough review-history data per learner.** Revisit after Tier 1 has been running long enough to accumulate meaningful review logs; at that point a real efficiency gain (20-30% fewer reviews for the same retention, per FSRS benchmarks) becomes achievable, and open-source implementations (`ts-fsrs`) reduce the lift.
8. **Adaptive new-word introduction rate** (cap new words per day based on current review-queue backlog) — a refinement on top of #1's scheduler once it's stable, to avoid overwhelming the learner when many words become due at once.

### What to explicitly *not* over-invest in for this app's scale
Full FSRS parameter-fitting/ML personalization and elaborate mastery-tier taxonomies are the kind of complexity that pays off at large-scale, multi-thousand-user products (Anki, Duolingo) but isn't warranted for a small family app — a well-implemented SM-2-style scheduler with confidence ratings, production-mode quizzing, and contextual sentences captures the large majority of the research-backed benefit at a small fraction of the engineering cost.

---

## Summary Table

| Priority | Feature | Research basis | Complexity |
|---|---|---|---|
| 1 | Spaced review scheduling (SM-2 / FSRS-lite) | Spacing effect, 1.1 | Medium |
| 2 | Confidence self-rating (Again/Hard/Good/Easy) | Metacognition, 1.7 | Low |
| 3 | Production-mode typing quiz | Testing effect, production>recognition, 1.2/1.6 | Low-Medium |
| 4 | Surface example sentences in review | Contextual learning, 1.5 | Very low |
| 5 | Cloze fill-in-the-blank from example sentences | Contextual + production, 1.5/1.6 | Medium-High |
| 6 | Deliberate interleaved multi-language sessions | Interleaving, desirable difficulty, 1.3/1.4 | Low (after #1) |
| 7 | Full FSRS | Optimal scheduling efficiency | High |
| 8 | Adaptive new-word intake rate | Cognitive load management | Low (after #1) |
