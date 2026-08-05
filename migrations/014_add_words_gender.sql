-- Stores a noun's grammatical gender (or 'plural', for a plural form that
-- has no gender of its own -- e.g. "Schulden") on the Word row itself,
-- instead of re-deriving it from word.text on every render. Needed once
-- gender can come from a live lookup (src/lib/genderApi.ts) rather than
-- only the article the user happened to type -- that result has to be
-- cached somewhere, not recomputed (and re-fetched over the network) on
-- every read.
--
-- part_of_speech (003_create_words.sql) already exists but has never been
-- populated by the app; this is its first real use, gating which words
-- even attempt a gender lookup (only 'noun').

alter table words add column if not exists gender text
  check (gender in ('masc', 'fem', 'neutr', 'plural'));
