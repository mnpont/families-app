-- Adds owner-scoped DELETE policies for review_log/word_schedule_state,
-- which 011_add_review_rls_policies.sql omitted.
--
-- Why this matters: deleting a Word (deleteWord/deleteDeckAndWords in
-- src/lib/vocabularyApi.ts, an existing, actively-used feature) cascades
-- via FK to review_log and word_schedule_state (both `word_id references
-- words(id) on delete cascade`). Without a DELETE policy, RLS may block
-- that cascade for the anon role -- 008_add_rls_policies.sql already
-- establishes the precedent of granting explicit delete rights on every
-- table reachable by such a cascade (words/translations/example_sentences
-- all get delete_all policies there), and 011 should have matched it for
-- these two tables but didn't. Adding this is safe regardless of whether
-- Postgres would have actually blocked the cascade -- it removes the doubt.

create policy "review_log_delete_own" on review_log for delete
  using (user_id = '00000000-0000-0000-0000-000000000001');

create policy "word_schedule_state_delete_own" on word_schedule_state for delete
  using (user_id = '00000000-0000-0000-0000-000000000001');
