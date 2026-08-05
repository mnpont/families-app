# Edge Functions

Example-sentence generation, running server-side so the LLM API key never
ships in the browser bundle (see the multi-language UI in `src/`, which has
no real user auth to gate a client-side key behind).

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

Both functions need `OPENAI_API_KEY` set as a Supabase Edge Function secret
(Project Settings → Edge Functions → Secrets, or `supabase secrets set
OPENAI_API_KEY=...`). `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are
provided automatically by the Supabase runtime — no need to set those.

## Deploying

```
supabase functions deploy generate-example-sentence
supabase functions deploy batch-generate-sentences
```

(Deploys both `_shared/` and the calling function, since Supabase bundles
relative imports.) Requires the Supabase CLI logged in and linked to this
project (`supabase link`).
