# Migrations

SQL schema for the v2 language-agnostic data model (`docs/v2-plan.md` Section 1). **None of this has been applied to the live Supabase project yet** — this session had no Supabase credentials at all (no env vars, no `.env`, no DB connection), so every live-touching step below is prepared but unexecuted.

## Order of operations

1. `npm run backup:words` (needs `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` in the environment) — exports the live `words` table to `/backups` as a CSV rollback safety net. **Do this first.**
2. Apply `001_create_languages.sql` through `006_create_deck_words.sql` in order, via the Supabase SQL editor (or `supabase db push` if the CLI gets wired into this repo).
3. Apply `007_add_rls_policies.sql`. Then rotate the Supabase anon key (Project Settings → API in the Supabase dashboard) and put the new key in `.env.local` / wherever the deployed app reads `VITE_SUPABASE_ANON_KEY` from.
4. Run `npm run backfill:live` (same env vars as step 1) to backfill the legacy `words` table into the new schema. Run `npx tsx scripts/backfillToV2Schema.ts --source=live --dry-run` first if you want to preview the counts against real data without writing anything.
5. Spot-check the results (the script prints a summary: words/translations/decks created, and counts for each data-quality fix — see the fix's own commit/PR description for the local dry-run numbers to compare against).
6. Once verified, apply `008_rename_legacy_words_table.sql` to rename `words` → `words_legacy` (kept, not dropped, as a further rollback net alongside the CSV backup).

Deliberately **not** included here: `ReviewLog` and `WordScheduleState` (spaced-repetition state). Those are Phase 1 work, once scheduling logic is actually being built — adding their tables now with no code using them would be premature.

## Files

1. `001_create_languages.sql`
2. `002_create_words.sql`
3. `003_create_translations.sql` — includes a TODO for a uniqueness constraint once multi-translation support ships; not needed yet since every migrated word has exactly one translation.
4. `004_create_example_sentences.sql`
5. `005_create_decks.sql` — `owner_id` defaults to the same hardcoded UUID as `src/constants/owner.ts`'s `OWNER_ID`.
6. `006_create_deck_words.sql`
7. `007_add_rls_policies.sql` — enables RLS on all six tables; only `decks`/`deck_words` get real owner-scoped write policies (that's the only table with an owner concept). See the file's own comments for the limitation this leaves open.
8. `008_rename_legacy_words_table.sql` — run last, after the backfill is verified.

## Related scripts (`/scripts`)

- `exportWordsBackup.ts` — CSV backup of the live `words` table.
- `backfillToV2Schema.ts` — the actual migration logic. Supports `--source=local --dry-run` (runs entirely offline against the bundled seed data, no credentials needed) and `--source=live` (the real thing, or `--source=live --dry-run` to preview against real data without writing).
