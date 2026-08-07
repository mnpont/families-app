-- Caches up to 3 LLM-generated plausible-but-wrong translations per word,
-- used as multiple-choice distractors in the Practice tab (see
-- supabase/functions/generate-distractors and docs/practice-mc-spec.md).
-- Generated once per word (mirrors example_sentences, migration 005) and
-- reused indefinitely -- cost/latency should scale with vocabulary size,
-- not with how often a word is reviewed. Null or empty falls back to the
-- client-side deck/length/part-of-speech heuristic in
-- src/utils/pickDistractors.ts, so a missing or failed generation never
-- blocks practice.

alter table words add column if not exists llm_distractors text[];
