-- Frees up the `words` name for the new schema's Word table (003), and
-- doubles as a rollback safety net: the legacy table is renamed, not
-- dropped, so pre-migration data is still one `alter table ... rename to
-- words` away from being the live table again if something goes wrong.
--
-- MUST run SECOND, right after 001_create_languages.sql and before
-- 003_create_words.sql. Originally this migration was meant to run LAST
-- (after the backfill), but 003_create_words.sql's `create table if not
-- exists words (...)` silently no-ops when a table named `words` already
-- exists (your original vocabulary table) -- it doesn't error, it just
-- skips creating the new schema's table, and then the next statement
-- (an index on a column that only exists in the new schema) fails with
-- something like `ERROR: 42703: column "language_id" does not exist`.
-- Renaming the legacy table out of the way first avoids that collision
-- entirely. scripts/backfillToV2Schema.ts's live source table name
-- reflects this: it reads from `words_legacy`, not `words`.

alter table words rename to words_legacy;
