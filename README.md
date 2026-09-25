# Toni Bover

In development 🚧

## Setup

Copy `.env.example` to `.env`. Site content comes from the published AWS reader. Builds fail when the reader is unavailable or returns an incomplete snapshot.

For the AWS reader build, fill in:

- `AWS_READER_ENVIRONMENT=dev`, `AWS_READER_REGION`, and the exact development `AWS_READER_FUNCTION_ARN` from the private admin rollout. The build verifies every response's environment and schema version.
- On Vercel Preview, enable OIDC and set `AWS_READER_ROLE_ARN` to the exact invoke-only development role. Vercel supplies `VERCEL_OIDC_TOKEN` during the build.
- Locally, set `AWS_READER_PROFILE` to a temporary, invoke-only development AWS profile. No admin Cognito session, static AWS key, or direct table/bucket permission is needed.
- If published posts have images, the image materialization step from issue #13 must write local assets under `public/content-images/` and a JSON manifest. Set `AWS_READER_IMAGE_MANIFEST` to that manifest's path. Its format is `{ "revision": 1, "images": { "<post-id>": { "version": 1, "main": "/content-images/<hash>.jpg", "thumb": "/content-images/<hash>.jpg" } } }`; `main` and `thumb` are present only for attached images. The loader rejects missing or stale assets.

## Discovery surfaces

- Sitemap: `/sitemap-index.xml` (lists both `/ca/*` and `/en/*` URLs).
- RSS feeds: `/ca/rss.xml` and `/en/rss.xml` (title + excerpt per item, scoped by language).

## Scripts

| Command           | Description                                                        |
| ----------------- | ------------------------------------------------------------------ |
| `pnpm dev`        | Start dev server                                                   |
| `pnpm build`      | Build from the AWS published snapshot and fail on incomplete data. |
| `pnpm preview`    | Preview built site                                                 |
| `pnpm format`     | Prettier write                                                     |
| `pnpm test`       | Run Vitest unit tests (pure modules)                               |
| `pnpm test:watch` | Vitest watch mode                                                  |

## Architecture

See `CLAUDE.md` for stack/conventions and [issue #12](https://github.com/boversauros/tonibover/issues/12) for the published snapshot migration.
