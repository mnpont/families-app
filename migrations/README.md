# Migrations

SQL schema for the v2 language-agnostic data model (`docs/v2-plan.md` Section 1).

## Order of operations

1. `npm run backup:words` (needs `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, e.g. in `.env.local`) — exports the live `words` table to `/backups` as a CSV rollback safety net. **Do this first.**
2. Apply `001_create_languages.sql`.
3. Apply `002_rename_legacy_words_table.sql` — renames your existing `words` table to `words_legacy`, freeing up the name `words` for the new schema. **This must run before `003_create_words.sql`**: `create table if not exists words` silently no-ops if a table named `words` already exists (your original one), which then makes the next statement fail on a column that only exists in the new schema. Rename first, avoid the collision entirely.
4. Apply `003_create_words.sql` through `007_create_deck_words.sql` in order.
5. Apply `008_add_rls_policies.sql`. Then rotate the Supabase anon key (Project Settings → API in the Supabase dashboard) and put the new key in `.env.local` / wherever the deployed app reads `VITE_SUPABASE_ANON_KEY` from.
6. Run `npm run backfill:live` (same env vars as step 1) to backfill `words_legacy` into the new schema. Run `npx tsx scripts/backfillToV2Schema.ts --source=live --dry-run` first if you want to preview the counts against real data without writing anything.
7. Spot-check the results (the script prints a summary: words/translations/decks created, and counts for each data-quality fix).

`words_legacy` is left in place afterward (not dropped) as a further rollback net alongside the CSV backup.

8. Apply `009_create_review_log.sql` through `012_add_review_delete_policies.sql` (Phase 1 Step 2 — spaced repetition). `010`'s backfill gives every already-existing word a fresh, immediately-due schedule row, so nothing is silently excluded from the review queue for predating the table. `012` closes a gap `011` left open -- see that file's comments.
9. Apply `013_restrict_target_languages.sql` whenever you want to scope the language picker down to a subset of `languages` (e.g. German/French only) without touching existing translation data.
10. Apply `014_add_words_gender.sql` for the word-list gender chip feature (Word Gender Indicator handoff).
11. Apply `015_add_words_llm_distractors.sql` for the Practice tab's LLM-generated multiple-choice distractors.

## Files

1. `001_create_languages.sql`
2. `002_rename_legacy_words_table.sql` — must run before `003`, see above.
3. `003_create_words.sql`
4. `004_create_translations.sql` — includes a TODO for a uniqueness constraint once multi-translation support ships; not needed yet since every migrated word has exactly one translation.
5. `005_create_example_sentences.sql`
6. `006_create_decks.sql` — `owner_id` defaults to the same hardcoded UUID as `src/constants/owner.ts`'s `OWNER_ID`.
7. `007_create_deck_words.sql`
8. `008_add_rls_policies.sql` — enables RLS on all six new tables; only `decks`/`deck_words` get real owner-scoped write policies (that's the only table with an owner concept). See the file's own comments for the limitation this leaves open.
9. `009_create_review_log.sql` — append-only per-review history feeding the SM-2 scheduler (`src/utils/scheduler.ts`). `user_id` defaults to `OWNER_ID`, same as `decks.owner_id`.
10. `010_create_word_schedule_state.sql` — live per-word/per-learner scheduler state (interval, ease factor, due date, repetition count), plus a one-time backfill giving every pre-existing word an immediately-due schedule row.
11. `011_add_review_rls_policies.sql` — RLS for both new tables, scoped to the hardcoded owner (no public read, unlike `words`/`decks`).
12. `012_add_review_delete_policies.sql` — adds the DELETE policies `011` should have included, matching `008`'s established precedent of granting delete rights on every table reachable by a Word's cascade delete.
13. `013_restrict_target_languages.sql` — adds `languages.is_target` so the picker can be scoped to a subset (e.g. German/French) without deleting English/Spanish, which every existing translation's `language_id` still points to (`src/utils/detectTranslationLanguage.ts` only ever returns `'en'`/`'es'`); also removes Italian outright, since nothing references it.
14. `014_add_words_gender.sql` — adds `words.gender` ('masc'/'fem'/'neutr'/'plural'), populated at add/edit time by `src/lib/genderApi.ts` (article parse, falling back to a live Wikidata lookup) whenever `part_of_speech = 'noun'`.
15. `015_add_words_llm_distractors.sql` — adds `words.llm_distractors` (text array), populated once per word by the `generate-distractors` Edge Function, called alongside `generate-example-sentence` right after a word is created.

## Related scripts (`/scripts`)

- `exportWordsBackup.ts` — CSV backup of the live `words` table. Run this *before* `002_rename_legacy_words_table.sql`, while the table is still named `words`.
- `backfillToV2Schema.ts` — the actual migration logic. Supports `--source=local --dry-run` (runs entirely offline against the bundled seed data, no credentials needed) and `--source=live` (reads from `words_legacy`, since by the time you run this the rename in step 3 above has already happened) or `--source=live --dry-run` to preview against real data without writing.
