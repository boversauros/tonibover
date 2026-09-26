# Toni Bover

In development 🚧

## Setup

Copy `.env.example` to `.env`. Site content comes from the published AWS reader. Builds fail when the reader is unavailable or returns an incomplete snapshot.

For the AWS reader build, fill in:

- `AWS_READER_ENVIRONMENT=dev`, `AWS_READER_REGION`, and the exact development `AWS_READER_FUNCTION_ARN` from the private admin rollout. The build verifies every response's environment and schema version.
- On Vercel Preview, enable OIDC and set `AWS_READER_ROLE_ARN` to the exact invoke-only development role. Vercel supplies `VERCEL_OIDC_TOKEN` during the build.
- Locally, set `AWS_READER_PROFILE` to a temporary, invoke-only development AWS profile. No admin Cognito session, static AWS key, or direct table/bucket permission is needed.
- `pnpm build` fetches the published snapshot and materializes attached images before Astro starts. `vercel.json` selects this command for Vercel deployments. It writes hashed files under ignored `public/content-images/` and a private manifest under `node_modules/.cache/tonibover/image-manifest.json`. The loader checks the manifest revision, post versions, and local files. `AWS_READER_IMAGE_MANIFEST` can override the manifest location for a dedicated build workspace. The development loader refreshes images with content and keeps its previous cache when a refresh fails.

Image grants remain in build memory. The fetcher accepts only signed HTTPS URLs on the configured Region's S3 host, refuses redirects, and verifies image type, length, bytes, and the reader metadata. A non-null image slot with missing or invalid bytes fails the build. Null slots keep the optional hero, thumbnail-to-hero fallback, and local placeholder. A successful rebuild replaces the generated asset directory, so unreferenced files are absent from the new deployment artifact. The hosting provider must prune old deployments and caches separately; already downloaded public images cannot be recalled. Review this publication policy before production cutover.

The extra build work is one media grant and one S3 GET for each attached main/thumb slot, plus a final reader revision call. Production also repeats the published snapshot read in Astro to verify the manifest matches the current revision. Identical bytes share one emitted file. To roll back this change before cutover, redeploy the last known good site artifact and restore the previous build command; previously published static images may remain in host or CDN caches until they expire or are purged.

## Discovery surfaces

- Sitemap: `/sitemap-index.xml` (lists both `/ca/*` and `/en/*` URLs).
- RSS feeds: `/ca/rss.xml` and `/en/rss.xml` (title + excerpt per item, scoped by language).

## Scripts

| Command           | Description                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `pnpm dev`        | Start dev server                                                                              |
| `pnpm build`      | Fetch, validate, and materialize published images, then build Astro; fail on incomplete data. |
| `pnpm preview`    | Preview built site                                                                            |
| `pnpm format`     | Prettier write                                                                                |
| `pnpm test`       | Run Vitest unit tests (pure modules)                                                          |
| `pnpm test:watch` | Vitest watch mode                                                                             |

## Architecture

See `CLAUDE.md` for stack/conventions and [issue #12](https://github.com/boversauros/tonibover/issues/12) for the published snapshot migration.
