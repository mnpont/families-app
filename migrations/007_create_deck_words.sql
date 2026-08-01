-- Join table -- a Word can belong to multiple Decks. Keeps deck membership
-- (pure organization) decoupled from scheduling state, which is deliberately
-- NOT part of this migration -- ReviewLog and WordScheduleState are Phase 1
-- work (docs/v2-plan.md Section 1), once spaced-repetition scheduling is
-- actually being implemented.

create table if not exists deck_words (
  deck_id bigint not null references decks(id) on delete cascade,
  word_id bigint not null references words(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (deck_id, word_id)
);
