# families-app

Vocabulary learning app. Supports any language present in the `languages` table (see `docs/v2-plan.md` for the v2 redesign this came out of).

## Development

```
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key
npm run dev
```

`npm run build` type-checks and produces a production build in `dist/`.

## Deployment

Hosted on [Vercel](https://vercel.com), auto-deployed from `main` (zero-config: Vercel detects the Vite build and serves `dist/`). Needs the same two env vars as local dev (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) set in the Vercel project's Environment Variables settings.

The project previously used GitHub Pages' classic "deploy from a branch" mechanism, which only publishes files as-is with no build step -- that silently broke the live site once the app moved off a single static `index.html` (Phase 0). Vercel replaces that deploy path entirely.

## Docs

- `docs/audit.md` — codebase audit that preceded the v2 redesign
- `docs/learning-science.md` — vocabulary-acquisition research behind the v2 feature backlog
- `docs/v2-plan.md` — the v2 data model and feature plan
- `migrations/` — SQL schema for the v2 data model (applied through `011_add_review_rls_policies.sql`)
