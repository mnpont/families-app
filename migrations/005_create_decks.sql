-- A user-defined category of words, scoped to one target language.
-- Replaces the legacy `words.family` free-text column.
--
-- Single shared user profile for now (no auth), but `owner_id` is present
-- from day one, defaulted to one hardcoded owner constant, so introducing
-- real multi-user accounts later is a data backfill, not a second schema
-- migration. Must match OWNER_ID in src/constants/owner.ts.
-- See docs/v2-plan.md Sections 1 and 3.

create table if not exists decks (
  id bigint generated always as identity primary key,
  name text not null,
  language_id text not null references languages(id),
  owner_id uuid not null default '00000000-0000-0000-0000-000000000001',
  created_at timestamptz not null default now()
);

create index if not exists decks_owner_id_idx on decks(owner_id);

-- Prevents duplicate deck names within the same owner+language.
create unique index if not exists decks_owner_language_name_idx on decks(owner_id, language_id, name);
