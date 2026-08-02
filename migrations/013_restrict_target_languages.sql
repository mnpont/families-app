-- Distinguishes "a language you can review/add words in" from "a language a
-- translation happens to be written in" -- both currently live in the same
-- `languages` table, but only the former should appear in the language
-- picker (src/components/LanguageSelector.tsx) or be selectable as a word's
-- own language.
--
-- Why English/Spanish can't just be deleted: `translations.language_id`
-- always resolves to 'en' or 'es' (src/utils/detectTranslationLanguage.ts
-- never returns anything else) for every word ever created, German or
-- French alike -- deleting those `languages` rows would be rejected by the
-- foreign key, or if forced, would wipe every word's translation text
-- app-wide. Flagging them non-target instead of deleting keeps every
-- existing translation intact while getting them out of the picker.

alter table languages add column if not exists is_target boolean not null default true;

update languages set is_target = false where id in ('en', 'es');

-- Italian, unlike English/Spanish, was never used as a translation gloss
-- (detectTranslationLanguage only ever returns 'en'/'es') and isn't a
-- language anyone reviews, so it's removed outright rather than hidden.
-- Cleans up any dependent rows first in case it was ever selected as a
-- review language -- deleting a `words` row cascades to translations/
-- example_sentences/deck_words/review_log/word_schedule_state (see
-- 004/005/007/009/010), but `decks.language_id` and `words.language_id`
-- themselves don't cascade from `languages`, so they're deleted explicitly
-- here before the language row.
delete from words where language_id = 'it';
delete from decks where language_id = 'it';
delete from languages where id = 'it';
