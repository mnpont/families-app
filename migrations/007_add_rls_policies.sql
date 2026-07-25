-- Enables Row Level Security on the v2 tables and adds policies scoped to
-- owner_id where ownership actually exists in the data model.
--
-- IMPORTANT LIMITATION: only `decks` (and `deck_words`, via its deck) have
-- an owner_id column -- `words`, `translations`, and `example_sentences`
-- are shared vocabulary content with no per-user ownership concept (see
-- docs/v2-plan.md Section 1: a Word is data, not a user-owned row). Because
-- there is still no real authentication (docs/v2-plan.md Section 3, single
-- shared user profile), these policies cannot verify a caller's identity --
-- an anon request can claim owner_id = the hardcoded OWNER_ID constant same
-- as the app does. This closes the "arbitrary owner_id" gap for decks but
-- does NOT fix the open-write posture on words/translations/example_sentences
-- flagged in docs/audit.md Section 4 (anyone with the anon key can still
-- read/write those) -- that requires real auth, which is out of scope for
-- Phase 0/1.
--
-- Run this AFTER 001-006 and BEFORE rotating the anon key (008 is unrelated
-- and independent of this file).

alter table languages enable row level security;
alter table words enable row level security;
alter table translations enable row level security;
alter table example_sentences enable row level security;
alter table decks enable row level security;
alter table deck_words enable row level security;

-- languages: read-only reference data, no anon writes needed.
create policy "languages_select_all" on languages for select using (true);

-- words / translations / example_sentences: shared vocabulary, no owner
-- column to scope to. Left as open read/write via the anon key, same
-- posture as the legacy `words` table -- not a regression, not a fix.
create policy "words_select_all" on words for select using (true);
create policy "words_write_all" on words for insert with check (true);
create policy "words_update_all" on words for update using (true);
create policy "words_delete_all" on words for delete using (true);

create policy "translations_select_all" on translations for select using (true);
create policy "translations_write_all" on translations for insert with check (true);
create policy "translations_update_all" on translations for update using (true);
create policy "translations_delete_all" on translations for delete using (true);

create policy "example_sentences_select_all" on example_sentences for select using (true);
create policy "example_sentences_write_all" on example_sentences for insert with check (true);
create policy "example_sentences_update_all" on example_sentences for update using (true);
create policy "example_sentences_delete_all" on example_sentences for delete using (true);

-- decks / deck_words: scoped to the single hardcoded owner. Reads stay
-- open (the app has no login screen to gate them behind), but writes must
-- target the owner constant -- this is the "RLS policies scoped to
-- owner_id" from the Phase 0 Step 2 task, and the first real use of the
-- owner_id column added in 005_create_decks.sql.
create policy "decks_select_all" on decks for select using (true);
create policy "decks_write_own" on decks for insert
  with check (owner_id = '00000000-0000-0000-0000-000000000001');
create policy "decks_update_own" on decks for update
  using (owner_id = '00000000-0000-0000-0000-000000000001');
create policy "decks_delete_own" on decks for delete
  using (owner_id = '00000000-0000-0000-0000-000000000001');

create policy "deck_words_select_all" on deck_words for select using (true);
create policy "deck_words_write_own" on deck_words for insert
  with check (
    exists (
      select 1 from decks
      where decks.id = deck_words.deck_id
      and decks.owner_id = '00000000-0000-0000-0000-000000000001'
    )
  );
create policy "deck_words_delete_own" on deck_words for delete
  using (
    exists (
      select 1 from decks
      where decks.id = deck_words.deck_id
      and decks.owner_id = '00000000-0000-0000-0000-000000000001'
    )
  );
