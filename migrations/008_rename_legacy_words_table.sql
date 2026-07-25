-- Rollback safety net: rename the legacy `words` table rather than
-- dropping it, once scripts/backfillToV2Schema.ts has been run
-- successfully against it and the app has been verified against the new
-- schema. Keeping it (renamed, untouched otherwise) means the pre-migration
-- data is still one `alter table ... rename to words` away from being the
-- live table again if something is wrong with the backfill.
--
-- Run this LAST -- after 001-007 and after the backfill script has
-- completed and been spot-checked. Do not run this before the backfill:
-- the script's default live-mode table name is `words`.

alter table words rename to words_legacy;
