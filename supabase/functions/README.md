# Edge Functions

Example-sentence and multiple-choice-distractor generation, running
server-side so the LLM API key never ships in the browser bundle (see the
multi-language UI in `src/`, which has no real user auth to gate a
client-side key behind), plus verb conjugation tables for the Practice
hub's Conjugation Drill.

## Functions

- **`generate-example-sentence`** — generates and stores one example
  sentence for a single Word. Called by `createWord()`
  (`src/lib/vocabularyApi.ts`) right after a word is inserted, so every new
  word gets a sentence the same way this app originally worked. Best-effort:
  if this fails (API outage, missing key), the word is still saved without a
  sentence.
- **`batch-generate-sentences`** — sweeps every Word missing a sentence
  (across all languages, or one via `{ languageId }`) and generates one for
  each, up to `{ limit }` (default 50) per call. Not wired to run
  automatically — invoke it manually (dashboard or `supabase functions
  invoke`) to catch up words added while the key was unset, or whose per-add
  call failed.
- **`_shared/generateSentence.ts`** — the actual OpenAI call + Supabase
  read/write logic both functions share, so they can't drift out of sync
  with each other or with the schema.
- **`generate-distractors`** — generates and stores up to 3 plausible-but-
  wrong translations for a single Word's Practice-tab multiple-choice
  questions (`words.llm_distractors`, migration `015`). Called by
  `createWord()` alongside `generate-example-sentence`, same best-effort
  contract. No-ops if the word already has distractors (use
  `refresh-distractors` to force a new set). Falls back to a client-side
  deck/length/part-of-speech heuristic (`src/utils/pickDistractors.ts`) when
  null/empty/short.
- **`refresh-distractors`** — replaces a word's distractors with a fresh set
  that avoids repeating the ones just shown. Fired in the background (never
  awaited) by `src/hooks/usePracticeSession.ts` right after a word is graded
  in Practice, so by the time it's due again a different set is already
  stored — the mechanism that keeps a learner from memorizing "the answer is
  whichever option isn't X/Y/Z" instead of actually recalling the word. A
  failed/empty regeneration leaves the existing set untouched rather than
  wiping it.
- **`batch-generate-distractors`** — the distractor equivalent of
  `batch-generate-sentences`: sweeps every Word missing `llm_distractors`,
  same `{ languageId, limit }` shape, not wired to run automatically. Only
  fills words with none yet — same no-op-if-present rule as
  `generate-distractors`.
- **`_shared/generateDistractors.ts`** — the OpenAI call + Supabase
  read/write logic all three distractor functions share, including the
  "avoid repeating these" prompt clause `refresh-distractors` uses.

- **`generate-conjugations`** — detects whether a single Word is a French
  verb and, if so, stores its full conjugation table in `words.conjugations`
  (migration `016`) and tags it `part_of_speech = 'verb'` if it had no type.
  Called fire-and-forget by `createWord()` and `updateWord()`, same
  best-effort contract as the two above. No LLM: forms come from the
  rule-based `french-verbs` library over the Lefff dictionary. A no-op for
  languages outside `CONJUGATION_LANGUAGES` (`['fr']`) and for words typed
  as anything but a verb.
- **`batch-generate-conjugations`** — the conjugation equivalent of the batch
  functions above: sweeps words with no conjugations yet, `{ languageId,
  limit, force }` (default limit 500; `force: true` regenerates words that
  already have them, e.g. after a shape version bump). Not wired to run
  automatically.
- **`_shared/generateConjugations.ts`** — loads the library (pinned
  `npm:` versions) and does the Supabase read/write for both.
- **`_shared/conjugationCore.ts`** — the pure rules (verb detection,
  auxiliary choice, agreement variants, reflexive elision, Lefff data
  fixes). Imports nothing, so the Node backfill
  (`scripts/backfillConjugations.ts`) and the Vitest suite (`tests/`) run
  the exact same code. See `docs/practice-hub-spec.md`.

## Why these exist (history)

The app used to have two Edge Functions with the same names that queried
the pre-restructure schema directly (`words.german`, `words.english`,
`words.example_sentence_de`) and hardcoded a German→Spanish prompt. When
`migrations/002_rename_legacy_words_table.sql` renamed that table to
`words_legacy` and introduced the normalized `words`/`translations`/
`example_sentences` schema, those functions started failing on their first
query and were never updated — silently orphaned, not deployed from this
repo, invisible in version control. These replacements target the current
schema and build the prompt from `languages.name` for both the word's
language and its translation's language, so they work for any language
pair in `languages`, not just German/Spanish.

## Environment

The five sentence/distractor functions need `OPENAI_API_KEY` set as a Supabase Edge Function
secret (Project Settings → Edge Functions → Secrets, or `supabase secrets
set OPENAI_API_KEY=...`) — one secret, shared by sentence and distractor
generation alike. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are
provided automatically by the Supabase runtime — no need to set those.
The two conjugation functions need no secret of their own.

## Deploying

```
supabase functions deploy generate-example-sentence
supabase functions deploy batch-generate-sentences
supabase functions deploy generate-distractors
supabase functions deploy batch-generate-distractors
supabase functions deploy refresh-distractors
supabase functions deploy generate-conjugations
supabase functions deploy batch-generate-conjugations
```

(Deploys both `_shared/` and the calling function, since Supabase bundles
relative imports.) Requires the Supabase CLI logged in and linked to this
project (`supabase link`).
