# Astro ↔ Supabase Admin Integration

> Companion to internal `PRD.md` (file-level technical detail). This document is the GitHub-issue-shaped PRD: problem, solution, user stories, implementation/testing decisions, scope.

---

## Problem Statement

I (Toni) want to publish and update the "Reflexions" content on my personal site without editing Markdown files in a repo, opening a code editor, or asking a developer for help. Today, all 30 posts in the Astro site are placeholder Markdown files; there is no real content yet, and the workflow for adding content requires committing files to git. I also need the site to support Catalan (default) and English, but currently the English version of the blog routes does not exist at all, and posts have no English translations.

A separate Next.js admin panel backed by Supabase has been built to manage these posts (see `ASTRO_INTEGRATION.md`). The Astro site needs to consume that data, replace the placeholder Markdown with Supabase-backed content, and stay fully static — without sacrificing image optimization, type safety, multilingual routing, or SEO.

## Solution

Replace the Markdown content collection with a custom Astro Content Loader that pulls posts, categories, and keywords from Supabase at build time. The Astro site stays statically generated, hosted on Vercel. When Toni publishes a change in the admin, a Supabase database webhook triggers a Vercel deploy hook; the site rebuilds automatically and the new content goes live within roughly a minute.

Content shape, rules, and behavior:

- Catalan is the default language; English entries appear only when Toni has actually written a translation in the admin. The language switcher on a Catalan-only post shows the English toggle as disabled with a "Not yet translated" tooltip — never a redirect, never silently hidden.
- Slugs are admin-defined per language, so URLs read like `/reflexions/aprenentatge-fotografia` and `/en/reflexions/learning-photography`.
- Post body is HTML (from the admin's rich text editor), sanitized on write in the admin and again on read in the loader.
- Each post has a single hero image plus a single thumbnail (matching admin schema; the existing `images[]` array and dead 2/3-column grid logic are removed).
- Categories and keywords are sourced from Supabase. The four places in the codebase that hardcode the three categories inline are replaced by reads against a `categories` collection. Keywords are slugified deterministically in the loader (lowercase + diacritic strip + dash-join) so URLs are clean.
- Posts are ordered by an admin-managed `sort_order` field (ascending), with `date` descending as a tiebreaker.
- Drafts (`is_published = false`) never reach the build.

The site adds a multi-locale sitemap and per-language RSS feed. Image rendering uses Astro's `<Image>` component with `image.remotePatterns` configured for Supabase Storage URLs, so optimization (AVIF/WebP, srcset) happens at build time on remote images.

## User Stories

1. As Toni, I want to write a new blog post in the admin panel and see it live on my site after a single rebuild, so that I never have to touch the Astro repo to publish content.
2. As Toni, I want to publish a post in Catalan only, so that I'm not forced to provide an English translation before going live.
3. As Toni, I want to add an English translation to an existing Catalan post later, so that translation work can happen at my pace.
4. As Toni, I want to mark a post as a draft (`is_published = false`), so that I can save in-progress work without it appearing publicly.
5. As Toni, I want a draft to be invisible to the public site, so that no one can guess a slug and read unfinished writing.
6. As Toni, I want each translation to have its own slug, so that URLs are meaningful in their respective languages and SEO-friendly.
7. As Toni, I want the order of posts on the listing page to be controlled by a sort field I manage in the admin, so that I can promote a post or reorder regardless of when it was added.
8. As Toni, I want posts that share the same `sort_order` to fall back to date-descending order, so that I'm not forced to keep all sort values unique.
9. As a reader, I want to land on `/reflexions` and see the latest posts in Catalan, so that I can browse the site in its primary language without a URL prefix.
10. As an English reader, I want `/en/reflexions` to list posts that have been translated to English, so that I'm only shown content I can read.
11. As an English reader on a Catalan-only post, I want the language toggle to indicate the post isn't translated yet rather than disappearing or redirecting me, so that I understand the state of the page.
12. As a reader, I want to filter posts by category at a URL like `/reflexions/vivencies`, so that I can browse one thematic stream.
13. As a reader, I want to follow a keyword link like `/reflexions/paraula-clau/sequencia-visual`, so that I can find related posts by tag.
14. As a reader on the English site, I want category and keyword pages to exist at the equivalent English URLs, so that the bilingual experience is symmetric.
15. As a reader, I want post images to load fast on mobile, so that the site performs well even on slow connections.
16. As a reader, I want post content to render with rich formatting (paragraphs, headings, emphasis, links), so that essays read well rather than as a wall of text.
17. As a reader, I want references at the end of each post to render in source order, so that I can follow citations as the author intended.
18. As a reader, I want a sitemap and RSS feed available, so that search engines can index the site and I can subscribe in a reader.
19. As Toni, I want each language to have its own RSS feed (`/ca/rss.xml`, `/en/rss.xml`), so that subscribers see content in the right language.
20. As Toni, I want to seed the database with a single sample post before launch, so that I can verify the entire pipeline works before authoring real content.
21. As Toni, I want all 30 placeholder Markdown files deleted on cutover, so that the repo doesn't carry dead content.
22. As Toni, I want builds to fail loudly when a published post is missing critical fields (title, slug, content, category), so that broken pages never deploy.
23. As Toni, I want the build to recover gracefully from minor missing fields (alt text, thumbnail), so that small omissions don't block a deploy.
24. As Toni, I want the admin to sanitize HTML on write and the loader to sanitize again on read, so that an editor bug or paste from the web can't inject scripts.
25. As Toni, I want category names to come from the database, so that renaming a category in the admin doesn't require a code change.
26. As Toni, I want categories to display in the language of the page (Vivències on Catalan pages, Experiences on English pages), so that the UI feels native in both locales.
27. As Toni, I want keyword slugs to be derived deterministically from the keyword text, so that I don't have to manage a separate slug field per keyword.
28. As Toni, I want the site to keep building from a local cache when I'm offline, so that I can keep working on UI without an internet connection.
29. As Toni, I want a Supabase database webhook to fire on changes to the seven content tables and trigger a Vercel rebuild, so that content updates propagate automatically.
30. As Toni, I want the rebuild to be debounced or coalesced when I save several fields in quick succession, so that the system doesn't run five builds for one publish.
31. As a developer, I want generated TypeScript types from the Supabase schema committed to the repo, so that the IDE catches schema drift at edit time, not deploy time.
32. As a developer, I want a Zod schema validating the loader's output, so that runtime drift between admin and site is caught at the collection boundary.
33. As a developer, I want anonymous Supabase access to be scoped by Row Level Security to published rows only, so that the build only ever sees what should ship.
34. As a developer, I want server-only env vars (no `PUBLIC_` prefix), so that secrets are not bundled into the client.
35. As a developer, I want the loader's transform/normalization logic decoupled from the network call, so that I can unit-test it on fixtures without Supabase.
36. As a developer, I want HTML sanitization, slugification, and reference normalization extracted as small pure modules, so that they're each independently testable.
37. As Toni, I want a clear empty state on listing pages on day one (zero posts) and on day two (one seed post), so that the site doesn't look broken before content arrives.
38. As Toni, I want a single seed post to render correctly in both Catalan and English on the first deploy, so that I can verify pipeline behavior end-to-end before authoring real content.

## Implementation Decisions

**Source of truth and content lifecycle.** Supabase is the single source of truth for blog content. The 30 placeholder Markdown files are deleted on cutover. There is no migration script — placeholders carry no real content. After cutover, Toni writes exclusively in the admin.

**Fetch model.** Astro builds remain fully static. A custom Astro Content Loader fetches from Supabase at build time, runs in Node only, and produces typed Content Collection entries. The loader replaces the existing Markdown loader for `posts` and adds two more collections: `categories` and `keywords`.

**Collection shape.** `posts` is flat: one entry per `(post, language)`. An English entry exists in the collection only when an admin row exists with non-empty `title`, `slug`, and `content`. Each entry carries `availableLangs` so the language switcher knows whether to enable the toggle on the other locale.

**Routing.** The Astro site already has `/ca/reflexions/*` routes. New `/en/reflexions/*` routes are added (index, paginated, category-filter, keyword-filter, post detail). Pagination preserves the existing page size of six. The English path component for keyword filtering is `keyword`; Catalan keeps `paraula-clau`.

**Slugs and URLs.** Admin-defined per-language post slugs. No legacy redirect map (no live URLs to preserve). Keyword slugs are derived deterministically in the loader from the keyword text by lowercasing, stripping diacritics, and joining with dashes. Category slugs are taken directly from the admin (`vivencies`, `influencies`, `perspectives`) and happen to match the slugs already wired into the Astro routes.

**Content rendering.** Post body is HTML, rendered with `set:html`. The existing Markdown render path is removed.

**Image fields.** Each post has at most one main image and one thumbnail, matching admin schema. The current `images[]` array, the `min(1)` Zod constraint, and the dead 1/2/3-column grid layout in the post detail page are removed. The reusable `Image` UI primitive is upgraded to use Astro's `<Image>` component, with `astro.config.mjs` configured to allow remote optimization of `*.supabase.co` URLs.

**Categories and keywords.** Categories are loaded as their own collection (id, slug, localized names). Pages stop hardcoding the three-element category array and read from the collection instead. Keywords are loaded as a third collection keyed by `(slug, language)`.

**References.** New shape per the admin spec: `type` (`'image' | 'text'`), `reference`, `blockquote`, `sort_order`. The existing `references.images[]` / `references.texts[]` split is removed. Render order honors `sort_order` ascending.

**Drafts.** Strict filter at loader level: only `is_published = true` reaches the collection. No preview deployment; preview happens inside the admin's editor.

**Ordering.** Primary sort by `posts.sort_order` ascending; secondary by `date` descending. The admin's `posts` table requires a new `sort_order INTEGER NOT NULL DEFAULT 0` column with an index, plus an admin UI affordance for setting it.

**Validation strategy.** Hybrid. Hard-fail (build fails) on missing title, slug, content, category, or unresolved category foreign key. Soft-fallback on missing alt text (use title), missing thumbnail (use main image), missing main image (omit hero figure block).

**HTML safety.** Defense-in-depth. Admin sanitizes on write; the loader sanitizes again on read using `sanitize-html` with an allowlist matching the editor's tag set. The exact allowlist is finalized once the editor identity is known (TBD — TipTap/Lexical/other).

**Environment, types, RLS.** Server-only env vars `SUPABASE_URL` and `SUPABASE_ANON_KEY` (no `PUBLIC_` prefix). Anon access is gated by RLS policies that restrict reads to rows attached to a published post on every relevant table. Supabase TypeScript types are generated via `supabase gen types typescript` (script: `pnpm types:gen`) and committed.

**Local dev.** Astro's content layer caches loader output between runs. The loader uses `meta` and digests for incremental sync, so an offline restart serves last-known content. A missing env var causes the loader to error in CI but allows fallback to cache locally.

**Build trigger.** A Supabase database webhook is configured on `posts`, `post_translations`, `post_keywords`, `post_references`, `images`, `categories`, and `category_translations`. It posts to a Vercel deploy hook URL with a shared signing secret. Vercel's coalescing handles bursts.

**SEO.** `@astrojs/sitemap` is added with multi-locale config. Per-language RSS feeds (`/ca/rss.xml`, `/en/rss.xml`) are emitted as Astro endpoints.

**Deep modules.** Six pure or near-pure modules will be extracted from the loader so each has a small, stable surface and can be tested in isolation:

1. **Keyword slug encoder.** Input: keyword label string and language. Output: URL-safe slug. Deterministic; collisions are intentional case/diacritic-folding.
2. **HTML sanitizer.** Input: raw HTML string. Output: sanitized HTML conforming to allowlist. Pure once configured.
3. **Post entry normalizer.** Input: a Supabase post row joined with translations, images, references, keywords. Output: an array of zero, one, or two flat entries (one per non-empty translation), with all soft-fallbacks resolved. Pure transform; no I/O.
4. **Reference list normalizer.** Input: raw `post_references` rows. Output: ordered list of references in render shape.
5. **Validation gate.** Input: a normalized entry. Output: `{ ok: entry } | { fail: string[] }`. Encapsulates hard-fail rules; surfaces clear messages.
6. **Supabase content fetcher.** The thin I/O layer. Input: Supabase client and language id. Output: raw rows. The only module that touches the network.

The Content Loader composes the fetcher, normalizer, validation gate, and (via the normalizer) the sanitizer and slug encoder. The boundary between I/O and pure transform stays sharp on purpose.

## Testing Decisions

**What makes a good test here.** Tests assert observable behavior of small modules at their public boundary — input rows in, normalized entries out; raw HTML in, sanitized HTML out; keyword text in, slug out. They do not assert internal call sequences, do not mock the things being tested, and do not pin types of intermediate values. Fixtures are tiny hand-written JSON blobs that resemble real Supabase responses; assertions check shape and key behaviors (presence of fallback alt, sort order, sanitized output) rather than exact string equality on long content.

**Modules to test (recommended scope, please confirm):**

1. **Keyword slug encoder.** High-leverage, pure, edge-case rich (diacritics, casing, whitespace runs, punctuation, collisions across two keywords differing only in accent). Must test.
2. **HTML sanitizer.** Verifies allowlist boundary: known-bad tags (script, iframe, on\*-handlers, javascript: URLs) are stripped; allowed tags (p, h2, em, a with safe href) survive. Must test.
3. **Post entry normalizer.** Covers the language-pivot logic: Catalan-only post emits one entry, both-languages emits two, empty English row emits one. Soft-fallbacks (alt ← title, thumbnail ← image) verified. Must test.
4. **Validation gate.** Each hard-fail rule has a positive and a negative case. Must test.
5. **Reference list normalizer.** Sort order + type bucketing. Should test.
6. **Supabase content fetcher.** Skipped at unit level; covered by a single end-to-end build test against the seed post in a real Supabase project. The repo currently has no test infrastructure, so the fetcher's correctness is verified by the integration step (build the site, assert the seed post page renders).

**Prior art.** The repo currently has no test setup; tests are introduced fresh as part of this work. Vitest is the natural choice given Vite/Astro tooling already present. Tests live alongside the modules under `__tests__` folders or `*.test.ts` co-location, whichever the developer prefers.

## Out of Scope

- Migrating real Markdown content. There is none — the 30 existing files are placeholders.
- Preview deployments for unpublished drafts. Preview happens inside the admin's editor.
- Multi-image galleries per post.
- Manually managed redirect maps for old URLs (the placeholder URLs were never live).
- Search across posts (no client-side or server-side search added).
- Comments, reactions, or any reader interactivity beyond reading and following links.
- Admin-side schema design (covered by the admin repo and `ASTRO_INTEGRATION.md`), except for the two changes called out as prerequisites: `posts.sort_order` and RLS read policies.
- Authoring custom Astro Image presets / placeholder imagery beyond the existing primitive.
- Internationalization of the site's static pages (`biografia`, `agraïments`, `documental`, etc.) — those continue to use the existing `src/i18n/{ca,en}.ts` model, untouched by this work.

## Further Notes

**Open TBDs to resolve before implementation:**

1. Rich text editor identity in the admin (sets the sanitize allowlist concretely).
2. Webhook signing format (header name + secret rotation policy).
3. Date display format on post pages — currently no date is shown, so this is also a UX decision (recommend `DD/MM/YYYY` for Catalan, locale-formatted for English).
4. Empty-state copy for listing pages on day one. Strings need to land in the i18n files for both languages.
5. RLS policy granularity — per-table policies vs. exposing a `published_posts` view to the anon role. Decide during admin prerequisite work.

**Companion document.** A separate, file-level `PRD.md` already exists in the repo with a detailed file-by-file impact list, sequencing into five implementation phases, and a risk table. It complements this issue but is not the source of record for cross-team alignment — this issue is.

**Sequencing dependency.** Admin schema changes (`sort_order` column, RLS policies, webhook config) block production cutover but do not block site-side work in phases 1–3 (scaffolding, loader, page refactors). Those can proceed against a Supabase project containing the seed post as soon as types are generated and env vars are provisioned.
