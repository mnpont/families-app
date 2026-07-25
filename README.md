# families-app

Vocabulary learning app, currently German-focused with a v2 multi-language redesign in progress (see `docs/v2-plan.md`).

## Development

```
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key
npm run dev
```

`npm run build` type-checks and produces a production build in `dist/`.

## Docs

- `docs/audit.md` — codebase audit that preceded the v2 redesign
- `docs/learning-science.md` — vocabulary-acquisition research behind the v2 feature backlog
- `docs/v2-plan.md` — the v2 data model and feature plan
- `migrations/` — SQL schema for the v2 data model (not yet applied to the live database)
