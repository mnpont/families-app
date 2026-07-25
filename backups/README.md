# Backups

CSV snapshots of the live Supabase `words` table, taken before running `scripts/backfillToV2Schema.ts` against it, as a rollback safety net alongside `migrations/008_rename_legacy_words_table.sql` (which keeps the original table around, renamed, rather than dropping it).

Generate one with:

```
VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npx tsx scripts/exportWordsBackup.ts
```

This writes `words_backup_<ISO-timestamp>.csv` into this directory. Commit it once created.
