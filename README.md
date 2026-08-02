# families-app

A vocabulary-learning app: add words in any language, group them into categories ("families"), and review them with a spaced-repetition flashcard scheduler.

- **Multi-language** — not hardcoded to one target language; language pairs live in the data model, not the code.
- **Spaced repetition** — an SM-2-style scheduler drives the review queue, tuned to avoid the "stuck at the floor" ease-factor problem in textbook SM-2 (see `src/utils/scheduler.ts`).
- **Word lookup assist** — optional inline translation suggestions while adding a word, always editable before saving.
- **Synced storage** — words, families, and review history persist to Supabase (Postgres + row-level security), not just local state.

## Tech stack

React + TypeScript + Vite, backed by Supabase. Deployed on [Vercel](https://vercel.com), auto-deployed from `main`.

## Development

```
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key
npm run dev
```

`npm run build` type-checks and produces a production build in `dist/`.

## Data model

The schema (languages, words, translations, decks, spaced-repetition state) is defined as an ordered set of SQL migrations in `migrations/`, with the rationale for each step in `migrations/README.md`.

## Project history

This started as a single static `index.html` file and was restructured into the current Vite/TypeScript project alongside a redesign of the data model to support multiple languages and spaced repetition. The docs behind that redesign are kept in `docs/`:

- `docs/audit.md` — audit of the original codebase that motivated the redesign
- `docs/learning-science.md` — spaced-repetition research behind the review feature
- `docs/v2-plan.md` — the resulting data model and feature plan
