# Astro ↔ Supabase Admin Integration — Implementation Plan

Source PRD: `PRD-issue.md` (companion: `PRD.md`, `ASTRO_INTEGRATION.md`)

## Status

- **Phase 0 — Admin prerequisites: ✅ DONE** (Supabase project provisioned; `posts`, `post_translations`, `post_keywords`, `keywords`, `post_references`, `categories`, `category_translations`, `images`, `languages` tables live; admin UI in place; seed posts (6) inserted; RLS policies on read paths verified by anon SELECT through Astro loader).
- **Phase 1 — CA-only tracer bullet: ✅ DONE** (delivered on branch `feat/phase-1-posts-loader`; see Phase 1 section below for what shipped + deltas).
- Phase 2–6: pending.

## Architectural decisions

Durable across all phases:

- **Routes**: `/ca/reflexions/*` already exists. Add `/en/reflexions/*` mirror. Keyword path component is `paraula-clau` (CA) and `keyword` (EN), routed via existing `getLocalizedPath` helper. Pagination preserved at `pageSize: 6`.
- **Schema (Astro side)**: three Content Collections — `posts` (flat, one entry per `(post, lang)`), `categories`, `keywords`. EN entry exists only when admin row has non-empty `title`/`slug`/`content`.
- **Schema (Supabase, locked by admin)**: `posts`, `post_translations`, `post_keywords`, `keywords`, `post_references`, `categories`, `category_translations`, `images`, `languages`. Language IDs: `1=ca`, `2=en`.
- **Fetch model**: Custom Astro Content Loader, runs in Node at build time. Static output. Anonymous Supabase access gated by RLS policies (published rows only).
- **Content format**: HTML in DB, sanitized at admin write + loader read (`sanitize-html` allowlist). Rendered with `<Fragment set:html>`.
- **Image pipeline**: Astro `<Image>` component with `image.remotePatterns` for `*.supabase.co`. Single hero `image` + single `thumbnail` per post.
- **Env vars**: server-only `SUPABASE_URL` + `SUPABASE_ANON_KEY` (no `PUBLIC_` prefix).
- **Validation**: hybrid. Hard-fail on missing `title`, `slug`, `content`, `category`, unresolved category FK. Soft-fallback: `alt ← title`, `thumbnail ← image`, `image absent → omit hero figure`.
- **Ordering**: `sort_order ASC, date DESC` (tiebreaker).
- **Drafts**: strict `is_published = true` filter at loader. No preview deployments.
- **Build trigger**: Supabase DB webhook → Vercel deploy hook (signed). Vercel coalesces bursts.
- **Pure modules to extract** (all testable in isolation): keyword slug encoder, HTML sanitizer, post entry normalizer, reference list normalizer, validation gate, Supabase content fetcher.

## Phase 1 — CA-only tracer bullet: post pipeline live ✅ DONE

User stories: 1, 9, 15, 16, 17, 22 (partial), 38 (partial).

### Delivery notes (post-merge)

Shipped on branch `feat/phase-1-posts-loader`. Deltas vs. original plan text:

- Placeholder MD count was 100 (not 30); all deleted.
- Loader uses `astro:env/server` for `SUPABASE_URL` / `SUPABASE_ANON_KEY` (typed, build-time validation).
- `src/components/ui/Image.astro` branches on URL: remote (`http(s)://*`) routes through `astro:assets` `<Image>` with `inferSize`; local public paths (`/images/...`) fall through to plain `<img>` so existing pages (`biografia`, `documental`, etc.) keep working.
- Phase 1 stop-gap: posts with both `image_id` and `thumbnail_id` NULL get a placeholder thumbnail (`/images/inici_img.webp`) so they still appear in listings. Hero figure remains omitted when `image` is absent (per plan). Remove placeholder branch once admin attaches real images.
- References render as a single flat list sorted by `sort_order` (per implementation plan decision); `type`-grouped rendering deferred.
- `sharp` build script approved via `pnpm.onlyBuiltDependencies` in `package.json` (needed by `astro:assets`).

### What to build

End-to-end slice: a single seed post in Supabase renders at the existing `/ca/reflexions/[slug]` URL with optimized hero image, sanitized HTML body, and references in order. No EN, no category collection, no keyword collection yet — just enough plumbing to prove the loader → collection → page chain works against real Supabase data.

Add `@supabase/supabase-js`, env scaffolding, `lib/supabase.ts` (server-only client). Build minimal `lib/loaders/posts.ts` that fetches CA translations only, joins images and references, and emits flat collection entries. Replace the existing Markdown-based `posts` collection definition in `src/content/config.ts` with the loader-driven one. Refactor `src/components/ui/Image.astro` to wrap Astro's `<Image>` and configure `astro.config.mjs` `image.remotePatterns` for Supabase Storage. Update `src/pages/ca/reflexions/[...slug].astro` to render `<Fragment set:html={content}>` and the new references shape (`type` / `reference` / `blockquote` / `sort_order`); drop `images[]` array handling and dead 1/2/3-column grid logic. Update `src/pages/ca/reflexions/[...page].astro` to consume new entry shape (single `thumbnail`). **Delete all 30 placeholder Markdown files in `src/content/posts/`.**

Categories stay hardcoded in pages this phase (replaced in Phase 2). Validation/sanitization is best-effort (full extraction in Phase 4).

### Acceptance criteria

- `astro build` succeeds against a Supabase project containing one CA-only seed post.
- `/ca/reflexions/` index lists the seed post with optimized thumbnail.
- `/ca/reflexions/<seed-slug>` renders title, hero image (optimized AVIF/WebP via `<Image>`), HTML body, references list in `sort_order`.
- All 30 placeholder MD files removed; `pnpm dev` runs without referencing them.
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` documented in `.env.example`.

## Phase 2 — Categories + keywords as collections (CA)

User stories: 12, 13, 25, 27.

### What to build

Replace the four inline hardcoded category arrays in CA pages with reads against a real `categories` collection. Add a `keywords` collection so keyword filter pages route off Supabase data and slugs are deterministically derived.

Build `lib/loaders/categories.ts` (id, slug, localized names) and `lib/loaders/keywords.ts` (joins `post_keywords` → `keywords`, derives slug per `(label, lang)` via deterministic encoder: lowercase + diacritic strip + dash-join). Wire `getCollection('categories')` into CA reflexions index, paginated index, and category pages. Wire `/ca/reflexions/paraula-clau/[keyword]/[...page].astro` to consume the keywords collection (lookup by slug, list posts whose `keywords[]` contain that label).

The keyword slug encoder is extracted as its own module here — it's reused by the keyword loader and the post entry's `keywords[]` rendering. Sanitization/validation modules still informal until Phase 4.

### Acceptance criteria

- `/ca/reflexions/vivencies/` (and the other two slugs) lists posts in that category, sourced from collection — zero hardcoded category arrays remain in CA pages.
- `/ca/reflexions/paraula-clau/<encoded-slug>/` lists posts with that keyword.
- Keyword link rendered on a post detail page routes to the matching keyword index.
- Diacritic-folded keywords (`Vivència` and `vivencia`) collapse to one slug.

## Phase 3 — English mirror + language switcher

User stories: 2, 3, 6, 7, 8, 10, 11, 14, 26.

### What to build

Bilingual surface lit up. EN entries appear in collections only when admin has non-empty translation rows. Listing/category/keyword/post pages mirror CA at `/en/reflexions/*` with admin-defined per-language slugs. The language switcher reflects translation availability.

Extend `posts` loader to emit one entry per non-empty `(post, lang)` translation, each carrying `availableLangs: ('ca'|'en')[]`. Apply ordering: primary `posts.sort_order ASC`, secondary `date DESC`. Extend `categories` loader to expose `name.ca` / `name.en` and render the localized name on CA vs EN pages. Extend `keywords` loader keyed by `(slug, lang)`.

Add four new EN route files mirroring CA: `/en/reflexions/[...page].astro`, `/en/reflexions/[category]/[...page].astro`, `/en/reflexions/keyword/[keyword]/[...page].astro`, `/en/reflexions/[...slug].astro`. Each filters its collection by `lang === 'en'`. Update `LanguageSwitcher.astro` to read the current entry's `availableLangs`: if the other locale is missing, render the toggle visibly disabled with a "Not yet translated" tooltip — never a redirect, never silently hidden. Localized strings for the tooltip land in `i18n/{ca,en}.ts`.

### Acceptance criteria

- Seed post translated to EN renders at both `/ca/reflexions/<ca-slug>` and `/en/reflexions/<en-slug>`.
- CA-only post: `/ca` URL works; EN switcher visible but disabled with tooltip; no `/en/reflexions/<en-slug>` route generated.
- `/en/reflexions/<category>/` and `/en/reflexions/keyword/<slug>/` list only EN-translated posts.
- Posts listing order: ascending `sort_order`, then descending `date`.
- Category names show in page locale (Vivències on CA, Experiences on EN).

## Phase 4 — Validation, sanitization, types, tests

User stories: 22, 23, 24, 31, 32, 33, 34, 35, 36.

### What to build

Lock the loader contract. Extract the deep modules per PRD §Implementation Decisions, formalize Zod schemas at the collection boundary, generate Supabase types, add Vitest, cover the pure modules.

Modules under `src/lib/`:
- `lib/sanitize.ts` — `sanitize-html` configured with allowlist matching the admin's editor (allowlist finalized once editor identity confirmed in Phase 0).
- `lib/slugify.ts` — keyword slug encoder (already extracted in Phase 2; tighten + test here).
- `lib/loaders/normalize-post.ts` — pure transform: raw joined Supabase row → array of zero/one/two flat entries with soft-fallbacks resolved.
- `lib/loaders/normalize-references.ts` — pure: raw rows → ordered render-shape list.
- `lib/loaders/validate.ts` — hard-fail gate, returns `{ ok } | { fail: string[] }` with clear messages.
- `lib/loaders/fetch-posts.ts` — thin I/O layer; the only module touching the network.

The Content Loader composes fetcher → normalizer → sanitizer (via normalizer) → validation gate. Zod schemas validate each entry before it enters the collection. `pnpm types:gen` script runs `supabase gen types typescript --project-id ... > src/lib/database.types.ts`; output committed.

Vitest setup added. Tests written: keyword slug encoder (diacritics, casing, whitespace runs, punctuation, collisions); HTML sanitizer (script/iframe/on*-handlers/javascript: URLs stripped, allowed tags survive); post entry normalizer (CA-only emits one, both-langs emits two, empty EN row emits one, alt fallback, thumbnail fallback); validation gate (positive + negative case per hard-fail rule); reference list normalizer (sort order + type bucketing). Fetcher skipped at unit level — covered by Phase 6 end-to-end build.

Server-only env var enforcement verified (no `PUBLIC_` prefix; loader fails in CI if missing).

### Acceptance criteria

- `pnpm test` runs Vitest; all five pure modules have passing tests.
- Build fails with clear message when seed post is missing `title` / `slug` / `content` / `category` / category FK.
- Soft-fallbacks verified: missing `alt` uses `title`; missing `thumbnail` uses `image`; missing `image` omits hero figure block (no broken element).
- `<script>`, `<iframe>`, `onclick=`, `javascript:` URLs stripped from rendered post body.
- `src/lib/database.types.ts` generated, committed, and imported by loaders.
- `pnpm types:gen` script in `package.json`.

## Phase 5 — SEO + dev experience

User stories: 18, 19, 28, 37.

### What to build

Discovery surfaces and offline development. Multi-locale sitemap, per-language RSS, listing empty states, verified content cache fallback.

Add `@astrojs/sitemap` with multi-locale config in `astro.config.mjs`. Emit per-language RSS endpoints at `src/pages/ca/rss.xml.ts` and `src/pages/en/rss.xml.ts` via `@astrojs/rss`, each pulling from the corresponding locale's posts. Add empty-state copy to `i18n/{ca,en}.ts` and render it on `/reflexions/` listings when zero published posts exist (day-one safety net). Verify Astro content layer cache + digest sync behavior: missing env vars in dev fall back to last-known cached collection; missing env vars in CI hard-fail.

### Acceptance criteria

- `dist/sitemap-index.xml` lists both `/ca/reflexions/*` and `/en/reflexions/*` URLs after build.
- `/ca/rss.xml` and `/en/rss.xml` parse in a feed reader; entries scoped per language.
- `/ca/reflexions/` and `/en/reflexions/` show localized empty-state copy when collection is empty.
- `pnpm dev` with no network and no `SUPABASE_*` env vars serves the last successful cache.
- `pnpm build` with missing env vars fails fast with a clear error.

## Phase 6 — Production cutover

User stories: 4, 5, 20, 21, 29, 30, 33.

### What to build

Wire content authoring → automatic deploy. Verify the full pipeline against a real Supabase project + Vercel project, then cut over.

Confirm Phase 0 admin prerequisites are live: `posts.sort_order` column + admin UI; RLS policies (anon `SELECT` gated to rows attached to a published post on all seven tables); rich text editor identity locked (sanitize allowlist already final in Phase 4 — re-verify). Seed Supabase with a single sample post translated to CA + EN. Provision Vercel project; create deploy hook URL; add `SUPABASE_URL` + `SUPABASE_ANON_KEY` to Vercel env. Configure Supabase Database Webhook to POST to the Vercel deploy hook on insert/update/delete of `posts`, `post_translations`, `post_keywords`, `post_references`, `images`, `categories`, `category_translations`, signed with shared secret.

End-to-end smoke: edit a field in admin, observe webhook fires, Vercel rebuild starts within seconds, completes within ~60s, change is live. Toggle `is_published = false` in admin, rebuild, confirm post not present anywhere on the public site (no slug guess works). Update `README.md` with env setup, `pnpm types:gen`, deploy hook configuration.

### Acceptance criteria

- Admin publish on seed post triggers Vercel rebuild that completes ≤ 60s; new content visible live.
- Toggling `is_published` to false → next rebuild → post absent from index, sitemap, RSS, and direct URL (404 or build-time omission).
- Burst of 5 admin saves coalesces into ≤ 2 rebuilds (Vercel coalescing verified).
- Webhook signature header validates against shared secret.
- `README.md` documents env setup, `pnpm types:gen`, deploy hook config, RLS expectations.
- All Phase 1–5 acceptance criteria still pass.
