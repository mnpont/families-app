-- A gloss/translation of a Word into another language. Replaces the legacy
-- `words.english` column -- a word can have multiple translations (e.g. into
-- both English and Spanish) without a schema change.
-- See docs/v2-plan.md Section 1.

create table if not exists translations (
  id bigint generated always as identity primary key,
  word_id bigint not null references words(id) on delete cascade,
  language_id text not null references languages(id),
  text text not null,
  is_primary boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists translations_word_id_idx on translations(word_id);
