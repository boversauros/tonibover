# Toni Bover

In development 🚧

## Setup

Copy `.env.example` to `.env` and fill in:

- `SUPABASE_URL` and `SUPABASE_ANON_KEY` — read at build time by `src/lib/supabase.ts`. `astro build` fails fast if missing. In `pnpm dev`, if Supabase is unreachable (network error or query failure), the loaders log a warning and serve the last-known Astro content-layer cache so you can keep working offline.
- `SUPABASE_PROJECT_ID` — used only by `pnpm types:gen`. Not read at build/runtime.

## Discovery surfaces

- Sitemap: `/sitemap-index.xml` (lists both `/ca/*` and `/en/*` URLs).
- RSS feeds: `/ca/rss.xml` and `/en/rss.xml` (title + excerpt per item, scoped by language).

## Scripts

| Command           | Description                                                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`        | Start dev server                                                                                                                                                 |
| `pnpm build`      | Production build (fetches from Supabase)                                                                                                                         |
| `pnpm preview`    | Preview built site                                                                                                                                               |
| `pnpm format`     | Prettier write                                                                                                                                                   |
| `pnpm test`       | Run Vitest unit tests (pure modules)                                                                                                                             |
| `pnpm test:watch` | Vitest watch mode                                                                                                                                                |
| `pnpm types:gen`  | Regenerate `src/lib/database.types.ts` from Supabase schema. Requires `SUPABASE_PROJECT_ID` env + Supabase CLI installed (`brew install supabase/tap/supabase`). |

## Architecture

See `CLAUDE.md` for stack/conventions and `plans/astro-supabase-admin-integration.md` for the phased Supabase integration plan.
