-- Live per-word, per-learner scheduler state -- the SM-2 inputs/outputs
-- (interval, ease factor, next due date, repetition count). Kept separate
-- from review_log (state vs. history) so the scheduler can be recomputed
-- from history later without mutating it. See docs/v2-plan.md Section 1
-- and src/utils/scheduler.ts for the algorithm this feeds.
--
-- user_id shaped exactly like decks.owner_id (006_create_decks.sql).

create table if not exists word_schedule_state (
  word_id bigint not null references words(id) on delete cascade,
  user_id uuid not null default '00000000-0000-0000-0000-000000000001',
  interval_days real not null default 0,
  ease_factor real not null default 2.5,
  due_at timestamptz not null default now(),
  -- Consecutive-success repetition count (SM-2's "n"): resets to 0 on
  -- "again", increments on hard/good/easy. Drives the fixed 1-day/6-day
  -- onboarding steps before interval*ease growth kicks in.
  review_count int not null default 0,
  primary key (word_id, user_id)
);

create index if not exists word_schedule_state_due_at_idx on word_schedule_state(user_id, due_at);

-- One-time backfill: every word that already existed before this migration
-- (including Phase 0's backfilled legacy data) gets a fresh schedule row so
-- it enters the review queue immediately instead of being silently excluded
-- for predating this table. New words get their row from
-- src/lib/vocabularyApi.ts's createWord() going forward.
insert into word_schedule_state (word_id, user_id)
select w.id, '00000000-0000-0000-0000-000000000001'
from words w
on conflict (word_id, user_id) do nothing;
