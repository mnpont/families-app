# families-app Audit — Vocabulary Feature

**Scope:** Full repository at `/home/user/families-app` as of 2026-07-25 (branch `claude/vocab-audit-learning-science-9ezcjf`).
**Purpose:** Input to a v2 architecture redesign, specifically to support multiple target languages (currently hardcoded to German).

## Repository inventory

The entire application is a **single static HTML file**:

```
/home/user/families-app/
├── README.md                 ("German vocabulary learning app")
├── index.html                 (4,034 lines — markup + CSS + full React app, all inline)
├── manifest.json              (PWA manifest, name "Families")
├── icon-192x192.png, icon-512x512.png, apple-touch-icon-180x180.png
```

There is no `package.json`, no `src/` tree, no build step, no test suite, and no server-side code. Everything — styles, icons-as-SVG, the React component tree, the vocabulary seed data, and the Supabase client — lives in `index.html`.

---

## 1. Tech stack & architecture

- **Framework:** React 18, loaded via UMD build from a CDN (`index.html:17-18`, `unpkg.com/react@18` and `react-dom@18`). No bundler/npm at all.
- **JSX transpilation:** In-browser, via Babel Standalone (`index.html:19`, `<script src="https://unpkg.com/@babel/standalone/babel.min.js">`) and `<script type="text/babel">` (`index.html:1012`). JSX is compiled client-side on every page load — there is no build/CI pipeline.
- **Single component:** The whole UI is one function component, `App()` (`index.html:1119`–`4028`), with ~25 `useState` hooks (`index.html:1120-1171`) and no component decomposition, no routing library (view switching is a `useState('families'|'flashcards')` string, `index.html:1120`), no context, no reducer — pure local state + prop-drilling-free single scope.
- **State management:** Plain React `useState`/`useEffect`. No Redux/Zustand/Context. All state (words, families, modals, flashcard index, sync status, edit modes) sits in one component's closure.
- **Persistence — two layers, not clearly reconciled:**
  1. **Supabase (Postgres-as-a-service)** is the primary remote store. The client is instantiated inline with a hardcoded project URL and anon key directly in the bundle (`index.html:1133-1136`):
     ```js
     const supabase = window.supabase.createClient(
         'https://ethrzcogkfrlhqwgqplg.supabase.co',
         'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
     );
     ```
     A single table `words` is used with columns `id, german, english, family, date_added, example_sentence_de, example_sentence_en, user_id` (inferred from the select/insert/update calls at `index.html:3162-3179`, `3196-3203`, `3275-3290`). `user_id` is always sent as `null` (`index.html:3202`, `3217`) — there is no auth/user scoping; it's a single shared vocabulary for anyone who loads the page.
  2. **`localStorage`** is used as a fallback/cache and for data that never made it into the Supabase schema:
     - `germanVocab` — full word list, mirrored on every `words` change (`index.html:3181-3182`, `3248-3251`).
     - `germanVocabVersion` — a hardcoded `'1.0'` sentinel used to decide whether to (re)seed from `preLoadedWords` (`index.html:3187-3193`, `3230-3235`).
     - `germanVocabEmptyFamilies` — families with no words yet; this concept **does not exist in Supabase at all** and is purely client-local (`index.html:1168-1171`, `3255-3257`). Empty families will not sync across devices/browsers.
  - No backend API layer of your own — the browser talks directly to Supabase's REST/PostgREST interface via the JS SDK. No RLS policies visible in-repo (can't be, since there's no migrations/schema file in this repo at all — the schema lives only in the Supabase project, outside version control).
- **Build/deploy:** None. This is deployed as a static file (likely GitHub Pages given the `CNAME` add/delete in git history: `git log` shows "Create CNAME" / "Delete CNAME" commits). No CI config, no linting, no tests found anywhere in the repo.

---

## 2. Vocabulary data model & German hardcoding

### Data model (as used at runtime)

Each vocabulary entry is a plain object with this shape (seen throughout, e.g. `index.html:1186-1192` and the Supabase mapping at `index.html:3171-3179`):

```js
{
  id: number,                 // Supabase row id (or seed literal 1000+ for preloaded data)
  german: string,              // target-language term  <-- HARDCODED FIELD NAME
  english: string,              // gloss/translation      <-- HARDCODED FIELD NAME (but seed data is actually Spanish, see below)
  family: string,               // free-text category/tag, e.g. "Animals", "General"
  dateAdded: string,            // ISO date (camelCase locally, `date_added` snake_case in Supabase)
  exampleSentenceDe: string|null,  // example sentence in the target language <-- HARDCODED "De" suffix
  exampleSentenceEn: string|null   // example sentence in the gloss language  <-- HARDCODED "En" suffix
}
```

### Where "German" (and English) is baked in as identifiers, not data

This is the crux of the multi-language redesign problem — the language pair is **not a parameter anywhere**; it's encoded directly into field names, variable names, UI copy, and category-detection logic:

- **Struct/field names:** `german` and `english` are literal object keys everywhere state is read/written — e.g. `currentWord?.german` / `currentWord?.english` in the flashcard render (`index.html:3643`, `3647-3648`, `3675`, `3680`), `word.german` / `word.english` in the word-list render (`index.html:3861-3862`), the Supabase row shape (`index.html:3171-3179`, `3266-3272`, `3286-3289`). Renaming/adding a language means touching every one of these call sites individually — there is no `word.targetLang` / `word.sourceLang` abstraction.
- **Example sentence fields:** `exampleSentenceDe` / `exampleSentenceEn` (`index.html:3177-3178`, `3691`, `3715`, `3717-3718`, `3863-3868`) hardcode "De" (German) and "En" (English) as suffixes rather than being keyed by language code dynamically.
- **React state variable names:** `germanWord`, `setGermanWord`, `englishWord`, `setEnglishWord` (`index.html:1122-1123`), and their edit-mode counterparts `editWordGerman`/`editWordEnglish` (`index.html:1162-1163`). These are used directly as the payload keys sent to Supabase (`index.html:3266-3272`).
- **UI copy/labels hardcode the language pair:**
  - Modal label `"German Word"` (`index.html:3766`, `3937`) and placeholder `'das Haus'` (`index.html:3772`) — a German example.
  - Field label `"Translation"` with placeholder `'the house'` (English) at `index.html:3788`.
  - `localStorage` keys themselves are named for German: `germanVocab`, `germanVocabVersion`, `germanVocabEmptyFamilies` (`index.html:1169`, `3181-3182`, `3187`, `3192-3193`, `3230-3235`, `3256`).
  - Comment `"Pre-load vocabulary from Google Doc"` (`index.html:1184`) and the seed constant name `preLoadedWords` — all German-vocab-specific.
- **`classifyWord(germanWord, englishWord)`** (`index.html:1051-1117`) — the auto-categorization function that assigns a word to a "family" — is a giant hand-written **regex dictionary of German words and their English glosses**, one block per category (Animals, Food & Drink, Emotions, Travel & Places, Time & Weather, Body & Health, Colors & Appearance, Numbers & Quantities, People & Family, Actions). Example: `/hund|katze|vogel|fisch|.../.test(word)` for Animals (`index.html:1056-1058`). This logic is **entirely language-specific** and untranslatable as-is to, say, French or Japanese vocabulary — it would need to be rebuilt from scratch per language, or replaced with an LLM/embedding-based classifier that isn't hardcoded to string-matching German/English words.
- **Interesting seed-data mismatch:** although the field is literally named `english`, the actual preloaded seed data (`index.html:1186` onward, e.g. id 1000 `"english": "estar presente"`) is **Spanish**, not English. This confirms the `german`/`english` field names are aspirational/stale labels rather than an enforced contract — the app already silently supports a different second language by just putting different text in the `english` field, which is itself evidence that the hardcoded naming is misleading and overdue for a generic `{ term, translation }` (or `{ sourceText, targetText, sourceLang, targetLang }`) shape.
- **`getFontSizeClass`** (`index.html:1174-1181`) is generic (length-based), not language-specific — this one is reusable as-is.
- **Family/category names in seed data** are in English regardless of vocab language (`"Buildings & Places"`, `"Emotions & Qualities"`, etc., e.g. `index.html:1197`, `1218`) — an implicit assumption that the UI/organizing language is always English, separate from whichever language pair the flashcards use.

### Supabase schema coupling
The remote schema (inferred, not in-repo) is column-for-column German/English shaped: `german`, `english`, `example_sentence_de`, `example_sentence_en` (`index.html:3171-3179`, `3196-3203`). Adding a third language, or making language a per-family or per-deck setting, requires **either** a schema migration (new columns per language pair — doesn't scale) **or** a full remodel to a generic `terms` table with a `language_code` column and a `translations`/`decks` join — this is a backend data-model change, not just a frontend one.

---

## 3. Component/file structure — reusable vs. tightly coupled

Since everything is one file/component, "reusable" here means "logically separable if the redesign splits `App()` into modules." What could carry over largely as-is vs. what's welded to the German/English design:

### Reusable as-is (language-agnostic, mostly cosmetic/structural)
- **CSS/visual design system** (`index.html:21-1007`): gradients, glassmorphism cards, flashcard flip animation, nav bar, modal styles. None of this references language.
- **SVG icon components**: `FamiliesIcon`, `FlashcardsIcon`, `PencilIcon`, `DeleteIcon` (`index.html:1016-1048`).
- **`shuffleArray`** (`index.html:1141-1148`) — generic Fisher-Yates, reusable.
- **`getFontSizeClass`** (`index.html:1174-1181`) — generic, reusable.
- **Flashcard flip/slide animation mechanics** (`animationClass`, `isFlipped`, `handleNextFlashcard`/`handlePrevFlashcard`, `index.html:3348-3374`) — structurally reusable, though the *content* rendered inside (`currentWord.german` / `currentWord.english`) needs to become generic field access.
- **Family/category grouping UI** (`family-grid`, `expanded-family`, family selector modal) — the *mechanism* of grouping words into named buckets is language-agnostic; only the auto-*classification* (`classifyWord`) is German-specific.
- **CRUD plumbing pattern** (`handleAddWord`, `handleDeleteWord`, `handleSaveEditWord`, `handleMoveToFamily`, `handleDeleteFamily`, `index.html:3259-3542`) — the optimistic-update-then-Supabase-call pattern is reusable; only the literal field names (`german`, `english`) inside each payload need to generalize.
- **Sync status indicator** (`syncStatus` state + `.sync-dot`, `index.html:1137`, 3548-3555) — generic.

### Tightly coupled to the single-language (German→English/Spanish) design — needs rework
- **`classifyWord`** (`index.html:1051-1117`): must be entirely reworked per language, or replaced by a language-independent classification strategy (e.g., an LLM call, or removing free-text regex categorization in favor of user-defined/AI-suggested tags that don't assume German morphology).
- **Word object shape** (`german`/`english`/`exampleSentenceDe`/`exampleSentenceEn`) used throughout rendering (flashcards `index.html:3641-3684`, word list `index.html:3861-3869`, edit modal `index.html:3937-3952`) and throughout the Supabase I/O (`index.html:3162-3300`, `3407-3441`) — this is the central refactor: every read/write site assumes exactly two fixed language slots.
- **State variable naming** (`germanWord`/`englishWord`/`editWordGerman`/`editWordEnglish`) — cosmetic but pervasive; should become generic (`termInput`/`translationInput` or an array/map keyed by language).
- **`localStorage` key names** (`germanVocab*`) — trivial to rename but currently baked into the cache-versioning logic (`index.html:3187-3193`), so a migration/versioning strategy is needed when renaming.
- **Modal labels/placeholders** ("German Word", `das Haus`, `the house`) — need to become language-parameterized strings, ideally driven by a per-deck/per-family "language pair" setting that doesn't exist yet.
- **Supabase table `words`** — single flat table with fixed German/English/example columns; a multi-language redesign needs either a `language_pair` column + generic `term`/`translation` columns, or a normalized schema (decks per language pair, or per-word language tags). This is a schema migration, not just a UI change, and isn't in version control at all today.
- **Seed data (`preLoadedWords`, ~281 entries, `index.html:1186-3153`)**: hardcoded as German/Spanish content baked directly into the bundle, gated by a `germanVocabVersion === '1.0'` check. This entire block (nearly 2,000 lines) should not ship in a v2 codebase as inline JS — it's fixture/seed data and belongs in a JSON file or DB migration, not the app bundle.

---

## 4. Fragile, hacky, duplicated, or refactor-worthy code

- **Everything in one file, no build step, JSX transpiled in the browser at runtime** (Babel Standalone, `index.html:19`). This means every page load re-parses and re-compiles ~3,000 lines of JSX client-side — slow, unversioned, untestable, and impossible to lint/type-check. A v2 should move to a real toolchain (Vite/Next.js) with the component tree split into files.
- **Supabase credentials (URL + anon key) hardcoded directly in client-shipped source** (`index.html:1133-1136`). Anon keys are meant to be public *if* Row Level Security is configured, but there's no RLS/schema in this repo to verify that, and `user_id` is always `null` (`index.html:3202`, `3217`) — meaning **any visitor can read/write/delete the entire shared word list**, and there's no auth at all despite the app being named "Families" (implying multi-family/multi-user separation that doesn't actually exist in the data model).
- **`supabase.createClient()` is called fresh inside the `App()` function body every render** (`index.html:1133-1136`) — should be created once outside the component (e.g., a module-level singleton) instead of on every re-render.
- **Dual-writer data model with inconsistent reconciliation:** words are written to Supabase *and* mirrored to `localStorage` (`index.html:3181-3182`, `3248-3251`), but on initial load, if Supabase has zero rows the app falls back to `localStorage`/seed data and then **loops and re-inserts every local/seed word into Supabase one-by-one with sequential `await`s** (`index.html:3196-3204`, `3211-3219`) — for 281 seed words this is 281 sequential network round-trips on a fresh/empty-Supabase load, no batching, no transaction, no dedupe-guard against double-seeding if the check races.
- **Silent/no id-collision handling for empty families**: `emptyFamilies` is pure client localStorage state (`index.html:1168-1171`) with no server-side representation — two browsers/devices will have divergent views of which empty families exist, and they can silently diverge from the "Synced" indicator's claim.
- **Sync status indicator can lie:** `syncStatus` is set to `'synced'` even in paths that only wrote to `localStorage` and never touched Supabase (e.g., the catch-block fallback at `index.html:3226-3239` sets `'error'`, but not all localStorage-only paths are clearly distinguished from true multi-device sync).
- **`window.confirm` / `alert` / `prompt`** used for destructive actions and family creation (`index.html:3377`, `3469`, `3516-3517`) — blocking browser dialogs, no custom UI, inconsistent with the rest of the app's custom modal system.
- **Data quality issues in seed content** itself (not code, but will affect any migration): typos/inconsistent casing in German entries (e.g. `"auswendig learnen"` should be `lernen`, id 1037; `"fach bleiben"` should likely be `wach bleiben`, id 1049), and multiple seed rows miscategorized into `"Animals"` that are clearly not animal-related (e.g. id 1025 `der Botschafter`/"embajador" [ambassador], id 1034 `der Fluggesellschaft`/"aerolinea" [airline], id 1060 `GmbH`, id 1081 a business-collapse idiom — all landed in "Animals", exposing bugs/gaps in `classifyWord`'s regex coverage, e.g. `/tier/` inside `/tier|kuh|schwein/` could false-positive-match substrings like ...actually these look like genuine misses where no keyword matched and something defaulted incorrectly — worth investigating `classifyWord`'s fallthrough behavior).
- **English/Spanish field-name mismatch** noted in Section 2 — the `english` field actually stores Spanish glosses in the shipped seed data, meaning the codebase already lies about its own schema in production data.
- **No tests, no lint config, no TypeScript** — every refactor step for multi-language support currently has zero automated safety net; a v2 effort should establish at least basic type definitions for the word/vocab model before expanding the language surface.
- **CNAME added then deleted in git history** (`git log`: "Create CNAME" / "Delete CNAME") suggests unresolved/experimental custom-domain deployment configuration — worth confirming current GitHub Pages/deploy target before v2 work touches hosting.

---

## Summary for v2 planning

The single highest-leverage change for multi-language support is collapsing the `german`/`english`/`exampleSentenceDe`/`exampleSentenceEn` quartet (repeated across ~15+ call sites in `index.html`, plus the Supabase `words` table schema) into a generic, language-tagged model — e.g. `{ term, translation, termLang, translationLang, exampleTerm, exampleTranslation }` or a normalized `decks(language_pair)` + `cards(term, translation)` schema — and replacing `classifyWord`'s hardcoded German/English regex dictionary with either per-language classifiers or a language-agnostic tagging approach. Everything visual/structural (flashcard mechanics, CRUD flow, sync-status UI, animations) can be carried forward largely unchanged once the data model is generalized. Given there is currently no build tooling, no tests, and credentials committed directly into a single 4,000-line HTML file, a v2 should also plan for extracting this into a proper project structure (bundler, component files, environment-based config, and at least a typed data model) alongside the language-generalization work.
