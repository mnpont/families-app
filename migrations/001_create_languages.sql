-- Reference table so "language" is data, not a hardcoded field/column name.
-- See docs/v2-plan.md Section 1.

create table if not exists languages (
  id text primary key,   -- ISO 639-1 code, e.g. 'de', 'en', 'es', 'fr'
  name text not null
);

insert into languages (id, name) values
  ('de', 'German'),
  ('en', 'English'),
  ('es', 'Spanish'),
  ('fr', 'French')
on conflict (id) do nothing;
