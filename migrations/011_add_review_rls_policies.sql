-- Enables RLS on the two scheduling tables (009/010) and scopes them to the
-- single hardcoded owner, matching decks/deck_words
-- (008_add_rls_policies.sql). No public "select_all" here: unlike
-- words/translations/decks, review history and schedule state are
-- per-learner and have no reason to be world-readable even under today's
-- single-shared-owner posture.

alter table review_log enable row level security;
alter table word_schedule_state enable row level security;

create policy "review_log_select_own" on review_log for select
  using (user_id = '00000000-0000-0000-0000-000000000001');
create policy "review_log_write_own" on review_log for insert
  with check (user_id = '00000000-0000-0000-0000-000000000001');

create policy "word_schedule_state_select_own" on word_schedule_state for select
  using (user_id = '00000000-0000-0000-0000-000000000001');
create policy "word_schedule_state_write_own" on word_schedule_state for insert
  with check (user_id = '00000000-0000-0000-0000-000000000001');
create policy "word_schedule_state_update_own" on word_schedule_state for update
  using (user_id = '00000000-0000-0000-0000-000000000001');
