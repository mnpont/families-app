# Practice Screen — Multiple Choice (v1) — Design & Technical Spec

Handoff doc: **Part A** is a design brief (for Claude Design or any designer picking this up); **Part B** is the technical spec (for whoever implements it — reference it when you're ready to build). Scope is deliberately narrow: one new screen, one new exercise type, zero schema changes.

Source: `docs/phase2-exercise-methods.md` §1.1 (multiple-choice with plausible distractors) — "Low complexity" tier, chosen first because it needs no new data and no new backend calls.

---

## 0. What this is

A **new, separate "Practice" tab** (third nav icon, alongside the existing "Families" and "Flashcards" tabs) — not a mode toggle inside the existing flip-flashcard screen. Flashcards stays exactly as it is today, untouched.

Practice v1 ships exactly **one exercise type**: multiple-choice recognition. The learner sees a word in the target language and picks its correct translation from 4 options (1 correct + 3 distractors).

**Practice and Flashcards share the same due queue.** Both read/write the same `word_schedule_state`/`review_log` tables — there's no separate "Practice progress." Grading a word in either tab affects when it's next due, everywhere. Think of Practice as a second lens on the same review queue, not a parallel track.

## 1. Out of scope for v1 (explicit non-goals)

- **No proficiency/level slider.** `docs/phase2-exercise-methods.md` §3.2 covers that, but it's inert until a second exercise type exists — not needed for this first build.
- **No reverse-direction questions.** Only target-language word → correct translation (matches the existing flashcard front/back direction). Translation → target-word production is a different, future exercise.
- **No other exercise types.** Word-order reconstruction, gender drills, etc. are separate future specs, not bundled here.
- **No deck-scoped distractors.** v1 draws distractors from the whole language's vocabulary, not just the word's own deck. Cheaper now; can be narrowed later without changing the interface (see §5).
- **No session summary/stats screen.** A nice-to-have, not required for a working v1.

## 2. Answer-feedback behavior (confirmed)

When the learner taps an option:
1. Immediately show whether it was right or wrong.
2. If wrong, also reveal which option was correct (highlight both: their wrong pick and the actual answer).
3. Options lock — no changing the answer after tapping.
4. The same Again/Hard/Good/Easy self-rating footer used in Flashcards today then appears, and the learner still explicitly grades their own recall — right/wrong from the MC tap does not auto-select a grade. This keeps the confidence self-rating step intact (the metacognitive benefit `docs/learning-science.md` §1.7 covers), and a wrong tap isn't always a true "blank," so it shouldn't be forced into "Again" automatically.

---

## Part A — Design Brief

### Existing visual language to stay consistent with

- **Palette/mood:** "golden hour" gradient — soft coral/peach gradient orbs floating in the background (`#FF9A9E` → `#FAD0C4`), glassmorphism cards (`backdrop-filter: blur(20px)`, translucent white), generously rounded corners (12–24px).
- **Type:** `Playfair Display` (serif) for headline/title text, `Inter` for body/UI text.
- **Existing components to reuse as-is, not redesign:** the header bar (sync indicator, app title, language selector), the nav bar (icon buttons, active-state highlight), the `button-primary`/`button-secondary` styles already used for the Again/Hard/Good/Easy grading row, and the `empty-state` pattern (title + subtext, centered) already used for "Loading..." and "All Caught Up" in Flashcards.

### Screen states

| State | What's shown | Notes |
|---|---|---|
| **Loading** | Same `empty-state` pattern as Flashcards ("Loading...") | Reuse verbatim, no new design needed |
| **Empty** (nothing due) | Same `empty-state` pattern, e.g. title "All Caught Up," subtext "Nothing to practice right now" | Slightly different subtext from Flashcards' empty state is fine, since it's a different screen, but keep the visual treatment identical |
| **Question — unanswered** | The target-language word/phrase as a prominent prompt (same scale-to-length behavior as the existing flashcard text), 4 answer options stacked as full-width tappable cards below it | Mobile-first — this is a PWA used on phones. Tap targets should be comfortably ≥44px tall. No grading buttons visible yet at this point. |
| **Question — answered** | Correct option highlighted (success state); if the learner was wrong, their tapped option also gets an error highlight. All 4 options become non-interactive. The grading footer (Again/Hard/Good/Easy) appears below. | **Don't rely on color alone** for correct/incorrect — pair the highlight with an icon (check / x) too, since color-only state is an accessibility gap worth closing here even though it isn't fully solved elsewhere in the app yet. |
| **Advancing to next question** | Transition after a grade is tapped | Left to your judgment — this isn't a flippable card like Flashcards, so the existing "flip and slide to the back of the deck" animation doesn't directly apply. A simple crossfade/slide between questions is a reasonable default. |
| **Complete** | Same `empty-state` visual pattern once the due queue is exhausted | Optionally show a one-line summary ("12 words practiced") — nice-to-have, not required |

### Open design decisions (yours to make)

- Exact transition/motion between questions.
- Artwork for the new "Practice" nav icon — should sit visually alongside the existing `FamiliesIcon`/`FlashcardsIcon` (simple single-color line icons, ~24px, filled/active state on selection). A checkmark, target, or quiz-card icon are reasonable directions.
- Whether to show a progress indicator (e.g., "3 of 12") during a session.
- Final microcopy throughout (empty states, etc. — the wording above is a placeholder, not final copy).

---

## Part B — Technical Spec

### Data flow — zero schema changes

- `ReviewLog.mode` stays `'recognition'` — multiple-choice is still a recognition task (choosing, not producing), so no migration is needed, no new enum value.
- Reuses `useReviewSession(languageId)` exactly as Flashcards does today for the due queue and `submitGrade` (which calls `scheduler.ts` + `vocabularyApi.submitReview` unmodified).
- **Distractor pool needs no new query.** `vocabularyApi.fetchVocabulary(languageId)` already returns every word in the language with its primary translation (it's what powers `FamiliesView` today) — reuse it to build the distractor pool client-side. No new Supabase query, no new Edge Function, nothing server-side to add.

### New files (suggested)

- **`src/utils/pickDistractors.ts`** — pure function: given the vocabulary pool, the correct word's id and translation text, and a target count (default 3), returns up to `count` distractor translation strings. Dedupes anything case-insensitively identical to the correct answer. Degrades gracefully — 2 distractors if that's all that's available, 1 if that's all, and the caller skips MC for that word entirely if zero distractors exist (a language with only one word, effectively a day-one-only edge case).
- **`src/components/MultipleChoiceCard.tsx`** — prompt + option buttons, tracks selected/correct/incorrect visual state locally.
- **`src/hooks/usePracticeSession.ts`** — composes `useReviewSession` (queue + grading, unchanged) with the `fetchVocabulary`-derived distractor pool; exposes cards + a way to get that word's distractor options. (If that composition turns out simpler done inline in `PracticeView`, that's a fine implementation-time call — this hook is a suggested shape, not a hard requirement.)
- **`src/components/PracticeView.tsx`** — mirrors `FlashcardsView.tsx`'s structure (loading/empty/active states), renders `MultipleChoiceCard`, reuses the existing grading-footer component/constants after an answer is picked.
- **`src/components/icons/PracticeIcon.tsx`** — new nav icon, matching the existing icon components' shape/props.

### Modified files

- **`src/App.tsx`** — `View` type gains `'practice'`; render `PracticeView` when active.
- **`src/components/NavBar.tsx`** — third nav button, same pattern as the existing two.
- **`src/components/Header.tsx`** — double check the header behaves the same for `'practice'` as it does for `'flashcards'` today (e.g. the `+` add-word button currently only renders for `'families'` — Practice should suppress it the same way Flashcards does).

### Distractor pool edge cases (explicit, easy to miss otherwise)

- A language with fewer than 4 words total → fewer than 3 distractors available; fall back to however many distinct candidates exist (down to a 2-option question). If literally zero distractors exist, skip MC for that card this session — it stays due and will surface normally once more words are added.
- Exclude any candidate distractor whose translation text case-insensitively matches the correct answer's text (prevents two options that are secretly the same right answer).

---

## Summary: what's already decided vs. what's still open

**Decided:** separate tab (not a toggle on Flashcards); shares the existing due queue and grading pipeline unchanged; immediate right/wrong feedback with the correct answer revealed on a miss; explicit self-rating still happens after, same four buttons as today; zero schema/backend changes; distractors sourced language-wide via the existing `fetchVocabulary` call.

**Open (for design, then for you at implementation time):** nav icon artwork, question-to-question transition, optional progress indicator, final copy.
