-- An example sentence using a Word, optionally with its own translation.
-- Replaces the legacy `words.example_sentence_de` / `example_sentence_en`
-- columns. Storing this generically is what lets the review flow surface
-- context and eventually generate cloze/fill-in-the-blank exercises
-- (docs/learning-science.md Tier 1 #4, Tier 2 #5) without another migration.

create table if not exists example_sentences (
  id bigint generated always as identity primary key,
  word_id bigint not null references words(id) on delete cascade,
  language_id text not null references languages(id),
  text text not null,
  translation_text text,
  created_at timestamptz not null default now()
);

create index if not exists example_sentences_word_id_idx on example_sentences(word_id);
