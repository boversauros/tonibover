# Toni Bover

In development 🚧

## Setup

Copy `.env.example` to `.env` and fill in the AWS reader values:

- `AWS_READER_ENVIRONMENT=dev`, `AWS_READER_REGION`, and the exact development `AWS_READER_FUNCTION_ARN` from the private admin rollout. The build verifies every response's environment and schema version.
- On Vercel Preview, enable OIDC and set `AWS_READER_ROLE_ARN` to the exact invoke-only development role. Vercel supplies `VERCEL_OIDC_TOKEN` during the build.
- Locally, set `AWS_READER_PROFILE` to a temporary, invoke-only development AWS profile. No admin Cognito session, static AWS key, or direct table/bucket permission is needed.
- If published posts have images, the image materialization step from issue #13 must write local assets under `public/content-images/` and a JSON manifest. Set `AWS_READER_IMAGE_MANIFEST` to that manifest's path. Its format is `{ "revision": 1, "images": { "<post-id>": { "version": 1, "main": "/content-images/<hash>.jpg", "thumb": "/content-images/<hash>.jpg" } } }`; `main` and `thumb` are present only for attached images. The loader rejects missing or stale assets.

The previous Supabase settings remain in the repository until development parity is verified:

- `SUPABASE_URL` and `SUPABASE_ANON_KEY` — retained for comparison with the former read path. The AWS loaders do not query Supabase. The Astro environment schema still declares these during this parity phase.
- `SUPABASE_PROJECT_ID` — used only by `pnpm types:gen`. Not read at build/runtime.

## Discovery surfaces

- Sitemap: `/sitemap-index.xml` (lists both `/ca/*` and `/en/*` URLs).
- RSS feeds: `/ca/rss.xml` and `/en/rss.xml` (title + excerpt per item, scoped by language).

## Scripts

| Command           | Description                                                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`        | Start dev server                                                                                                                                                 |
| `pnpm build`      | Static build from a validated published AWS snapshot; fails on incomplete data.                                                                                  |
| `pnpm preview`    | Preview built site                                                                                                                                               |
| `pnpm format`     | Prettier write                                                                                                                                                   |
| `pnpm test`       | Run Vitest unit tests (pure modules)                                                                                                                             |
| `pnpm test:watch` | Vitest watch mode                                                                                                                                                |
| `pnpm types:gen`  | Regenerate `src/lib/database.types.ts` from Supabase schema. Requires `SUPABASE_PROJECT_ID` env + Supabase CLI installed (`brew install supabase/tap/supabase`). |

## Architecture

See `CLAUDE.md` for stack/conventions and `plans/astro-supabase-admin-integration.md` for the phased Supabase integration plan.
