# PashuSetu 🐄 (पशुसेतू)

**SIH26128 · Govt. of Maharashtra** — multilingual, offline-first animal disease surveillance.
Farmer symptom reports → explainable AI triage → live officer risk map → syndromic dairy early-warning.

> Full plan, data model, build state: **[MASTER.md](./MASTER.md)** (single source of truth).

## Stack
Next.js 15 (App Router) · TypeScript · Tailwind v4 · next-intl (en/hi/mr) · Supabase (Postgres + PostGIS + pgvector, Auth, RLS) · PWA.

## Local setup
```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + keys
npm run dev
```

## Supabase setup (one-time)
1. Create a project at supabase.com.
2. SQL Editor → run `supabase/migrations/0001_init.sql`, then `supabase/seed.sql`.
3. Auth → Providers → Email: for fast dev, disable "Confirm email" (or keep it and use the emailed link).
4. Copy Project URL + anon key + service_role key into `.env.local` / Vercel env vars.

## Deploy
Vercel → Import this repo → add the three Supabase env vars → deploy. `git push` to `main` auto-deploys.
