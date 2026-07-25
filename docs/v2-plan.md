# v2 Plan — Multi-Language, Learning-Science-Backed Vocabulary App

Synthesized from `docs/audit.md` (codebase audit) and `docs/learning-science.md` (research). This is a **plan only** — nothing here has been implemented.

---

## 1. Language-agnostic data model

The current model hardcodes a single language pair as field names (`german`/`english`/`exampleSentenceDe`/`exampleSentenceEn`) in both the client and the inferred Supabase `words` table. The proposal below generalizes to any number of languages and leaves room for the scheduling/context fields Tier 1–2 features need.

### Entities

**`Language`**
```
id            (e.g. ISO 639-1 code: "de", "fr", "en", used as PK)
name          ("German", "French", ...)
```
Reference table so language is data, not a field name. Avoids a hardcoded English/German/Spanish assumption anywhere in code.

**`Word`**
```
id
language_id        -> Language
text                the term itself, e.g. "der Hund"
part_of_speech      optional (noun/verb/adj/...) — helps future features (e.g. gender/case), not required for v1
notes               optional free text
created_at
```
One row per vocabulary item in its *own* language — not paired to a translation at this level. This is what lets German, French, etc. coexist: a `Word` always belongs to exactly one `Language`.

**`Translation`**
```
id
word_id            -> Word
language_id        -> Language   (the translation's language, e.g. "en")
text                the translation/gloss
is_primary          bool (which translation shows by default on a card)
```
Replaces the fixed `english` column. A word can have translations into multiple languages (e.g. a German word glossed in both English and Spanish) without a schema change — this also cleanly fixes the audit's finding that the shipped `english` field actually contains Spanish text; that becomes a normal `Translation` row with `language_id = "es"`.

**`ExampleSentence`**
```
id
word_id            -> Word
language_id        -> Language   (sentence is written in the word's language, or could support a translated-sentence pair via a second row)
text                the sentence, with the target word identifiable (either by convention or an explicit span/offset for cloze rendering)
translation_text    optional, sentence rendered in the learner's base language
```
Replaces `exampleSentenceDe`/`exampleSentenceEn`. Storing the sentence generically also directly feeds Tier 1/2 features (#4 surfacing examples in review, #5 cloze generation) since the blank-target-word info lives here rather than being reconstructed at render time.

**`Deck`**
```
id
name                (was "family" — user-defined category, e.g. "Animals", "Travel")
language_id         -> Language  (a deck is scoped to one target language, enabling per-language organization)
owner/user_id       -> User (once auth exists — see Section 3)
```
Replaces the flat `family` string column, and gives category membership a home that isn't tied to language-specific classification logic (`classifyWord` becomes optional/AI-assisted tagging into decks, not a hardcoded regex dictionary).

**`DeckWord`** (join table)
```
deck_id  -> Deck
word_id  -> Word
```
Many-to-many — a word can belong to multiple decks, and decks stay a pure organizational concept, decoupled from scheduling state.

**`ReviewLog`** (new — didn't exist before; required for spaced repetition)
```
id
word_id            -> Word
user_id            -> User (once auth exists)
reviewed_at
grade               enum: again/hard/good/easy (or 0-3)
mode                enum: recognition/production/cloze (which review type was used)
```
Append-only history. This is both the audit trail for a scheduler and the raw material for eventually fitting FSRS parameters per user (Tier 3, research doc §1.1/§7).

**`WordScheduleState`** (new — the live scheduler state per word, per learner)
```
word_id            -> Word
user_id            -> User
interval_days
ease_factor          (or difficulty/stability if later moving to FSRS-lite)
due_at
review_count
mode_level           tracks recognition -> production graduation (research doc Tier 1 #3)
```
Kept separate from `ReviewLog` (state vs. history) so the scheduler can recompute state without mutating history, and so a future algorithm swap (SM-2 → FSRS) only needs to reinterpret/rebuild this table from `ReviewLog`.

### Why this shape

- `Language` as a first-class entity is what makes "German + French + any other language side by side" actually true — nothing keys off a literal language name anywhere else.
- Splitting `Word` and `Translation` (rather than a `{term, translation}` pair per row, which the audit doc floated as a minimal fix) supports multi-target translations and is a small additional cost now vs. a second migration later.
- `Deck` scoped to a language, not global, avoids "Animals" existing once and silently mixing German and French words the way the current `family` free-text column would if reused naively.
- `ReviewLog` + `WordScheduleState` are additive, not disruptive — they don't require changing anything about `Word`/`Translation`/`Deck`, so this part of the model can be introduced independent of the multi-language migration if sequencing requires it (see Section 3).

---

## 2. Prioritized feature backlog

Combines: word lookup, smarter capture, and the research-backed additions (learning-science.md Part 3), ordered by (impact × how much it depends on Section 1's model existing first).

### Phase 0 — Foundational (blocks almost everything else)
- **Data model migration**: introduce `Language`/`Translation`/`Deck`/`ExampleSentence` as above, backfill existing German/Spanish data into it. Nothing else below is clean to build on the current flat schema.
- **Extract from single-file `index.html`** into a real project structure (build tool, component files, typed model) — not required to be finished before feature work starts, but doing the data-model migration is a natural forcing function to also split the file, since every call site touching `word.german`/`word.english` needs editing anyway.

### Phase 1 — Core multi-language + smarter capture
- **Multi-language support in UI**: language selector, per-language decks, generalized flashcard rendering (`word.text`/`translation.text` instead of `.german`/`.english`).
- **Word lookup / smarter capture**: search a word, auto-fetch a definition/translation (dictionary API or LLM-assisted), one-click "add to deck" — this is the biggest usability lift for adding vocabulary and directly replaces the brittle `classifyWord` regex dictionary with either user choice or AI-suggested deck placement.
- **Spaced review scheduling (SM-2/FSRS-lite)** — learning-science.md Tier 1 #1. Requires `ReviewLog`/`WordScheduleState` from Section 1; highest research-backed impact of anything in this backlog.
- **Confidence self-rating (Again/Hard/Good/Easy)** — Tier 1 #2, and the input the scheduler needs — ship together with scheduling, not after.

### Phase 2 — Review-quality upgrades
- **Production-mode typing quiz** — Tier 1 #3.
- **Surface example sentences during review** — Tier 1 #4 (data already collected in `ExampleSentence`, currently just not rendered in review — cheapest win in the whole backlog once the model migration lands).
- **Cloze fill-in-the-blank from example sentences** — Tier 2 #5, depends on example-sentence coverage; may need an AI-assisted batch pass to backfill sentences for older words that lack them.

### Phase 3 — Once multi-language + scheduling are stable
- **Deliberate interleaved multi-language review sessions** — Tier 2 #6, pulls due words across languages/decks into one session rather than the current incidental single-language shuffle.
- **Adaptive new-word intake rate** — Tier 3 #8, caps new words per day against review backlog.

### Longer horizon
- **Full FSRS** — Tier 3 #7, worth revisiting once `ReviewLog` has enough history per learner to fit/benefit from it.

---

## 3. Blockers in the current structure (flag only, not fixing now)

- **No auth / no user scoping**: `user_id` is always sent as `null` to Supabase (audit §4). Several proposed entities (`Deck.owner`, `ReviewLog.user_id`, `WordScheduleState.user_id`) assume a real user identity exists. Multi-user spaced repetition doesn't make sense without this — each family member needs their own review state and schedule, not a shared one. This needs to be solved before Phase 1's scheduling work, not after.
- **No backend/API layer, no schema in version control**: the Supabase schema lives outside the repo entirely (audit §1, §2). The data-model migration in Section 1 is a schema migration against infrastructure this repo doesn't currently track — needs a migrations setup (even a simple SQL file checked into the repo) before Phase 0 can be executed safely.
- **Hardcoded Supabase credentials committed client-side, with implicit open write access** (audit §4) — orthogonal to the vocab redesign, but worth fixing alongside introducing real user accounts, since the two problems (open writes, no per-user data) share the same root cause.
- **No build tooling, no tests, no types** (audit §1, §4) — every one of the entities/fields introduced above currently has zero automated safety net. Splitting the file and adding at least a typed data model should happen before or during Phase 0, not as an afterthought, or the migration itself is high-risk to get right by hand across ~15+ call sites.
- **`classifyWord` is irreplaceable as-is** (audit §2, §3) — it's a hand-written German-only regex dictionary. The "smarter word capture" feature in Phase 1 needs a decision here: drop auto-classification in favor of manual/AI-assisted deck assignment (recommended), rather than trying to write an equivalent regex dictionary per language.
- **Seed data (`preLoadedWords`, ~281 entries) is inline in the bundle and mislabeled** (audit §2 — `english` field actually holds Spanish) — this needs to be migrated as data (into `Word`/`Translation`/`Deck` rows) rather than carried forward as a hardcoded JS constant; it's also the first real test case for the new schema's translation-language flexibility.
- **Dual-writer Supabase/localStorage model with unreconciled state** (audit §4 — `emptyFamilies` exists only in localStorage) — any new entity (schedule state, review logs) needs a single source of truth decision made explicitly, rather than inheriting the current pattern of "Supabase is primary, localStorage silently diverges."

---

## Sequencing recommendation

1. Resolve auth/user-scoping (blocker) — needed for any per-user scheduling to mean anything.
2. Data model migration (Section 1) + project restructuring, together.
3. Phase 1 (multi-language UI, word lookup/capture, spaced scheduling + self-rating) — the single biggest jump in both usability and learning-science grounding.
4. Phase 2 (production mode, contextual review, cloze).
5. Phase 3 and beyond, opportunistically.

This document is for review — no code changes have been made as part of this task.
