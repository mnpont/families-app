# Migrations

SQL schema for the v2 language-agnostic data model (`docs/v2-plan.md` Section 1). These files are **not applied to the live Supabase project yet** — Phase 0 is restructuring and schema design only; the actual cutover (backfilling the legacy `words` table into this schema and switching the app to read/write it) is separate follow-up work, by design (see the task's "clean cutover, no dual-write" decision).

Apply in order against the Supabase project's SQL editor (or `supabase db push` if using the Supabase CLI once it's wired into this repo):

1. `001_create_languages.sql`
2. `002_create_words.sql`
3. `003_create_translations.sql`
4. `004_create_example_sentences.sql`
5. `005_create_decks.sql`
6. `006_create_deck_words.sql`

Deliberately **not** included here: `ReviewLog` and `WordScheduleState` (spaced-repetition state). Those are Phase 1 work, once scheduling logic is actually being built — adding their tables now with no code using them would be premature.

The legacy `words` table (german/english/family/example_sentence_de/example_sentence_en, columns inferred in `docs/audit.md`) is left untouched by these migrations and keeps serving the app until the cutover happens.
