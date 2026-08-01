-- A vocabulary item in its own language. Replaces the legacy `words` table's
-- flat german/english columns -- a Word here is single-language; translations
-- live in the `translations` table (004) so a word can have more than one.
-- See docs/v2-plan.md Section 1.
--
-- Requires 002_rename_legacy_words_table.sql to have run first -- otherwise
-- this collides with the legacy `words` table (create table if not exists
-- silently no-ops instead of creating the new schema's table).

create table if not exists words (
  id bigint generated always as identity primary key,
  language_id text not null references languages(id),
  text text not null,
  part_of_speech text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists words_language_id_idx on words(language_id);
