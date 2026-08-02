-- Append-only history of every review attempt. Feeds the SM-2 scheduler
-- (see src/utils/scheduler.ts) and is the raw material for a future FSRS
-- fit (docs/learning-science.md Tier 3 #7). Deliberately excluded from
-- Phase 0 (migrations/007_create_deck_words.sql) -- ReviewLog belongs here,
-- Phase 1 Step 2, once scheduling is actually being built.
--
-- user_id is shaped exactly like decks.owner_id (006_create_decks.sql):
-- defaulted to the same single hardcoded owner until real accounts exist,
-- so multi-user support later is a data backfill, not a schema migration.

create table if not exists review_log (
  id bigint generated always as identity primary key,
  word_id bigint not null references words(id) on delete cascade,
  user_id uuid not null default '00000000-0000-0000-0000-000000000001',
  reviewed_at timestamptz not null default now(),
  grade text not null check (grade in ('again', 'hard', 'good', 'easy')),
  -- 'production' (typing) and 'cloze' aren't implemented yet (v2-plan.md
  -- Phase 2) but the column exists now so adding those review modes later
  -- doesn't require another migration.
  mode text not null default 'recognition' check (mode in ('recognition', 'production', 'cloze'))
);

create index if not exists review_log_word_id_idx on review_log(word_id);
create index if not exists review_log_user_id_idx on review_log(user_id);
