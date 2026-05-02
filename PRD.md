# PRD — Astro ↔ Supabase Admin Integration

**Status:** Draft
**Owner:** Toni Bover
**Last updated:** 2026-05-02
**Related docs:** `ASTRO_INTEGRATION.md` (admin-side spec)

---

## 1. Summary

Replace the placeholder Markdown content collection in this Astro 5 site with a Supabase-backed content pipeline driven by an external Next.js admin panel. The admin (separate repo) becomes the single source of truth for all blog ("reflexions") content. The Astro site continues to ship as a fully static build, fetching content from Supabase at build time and rebuilding on content changes via webhook.

## 2. Goals

- Toni edits blog posts in the Next.js admin; published changes appear on the live site after an automatic rebuild, with no code change required.
- Bilingual support (CA default, EN optional per post) wired end-to-end: routing, listings, language switcher, sitemap, RSS.
- Static-output preserved (`astro build` → static files on Vercel). No SSR. No runtime DB calls.
- Type-safe content: generated Supabase types + Zod-validated Astro Content Loader.
- Build fails fast on critical content errors; degrades gracefully on cosmetic ones.

## 3. Non-goals

- Real-time / live-edit content. Webhook-triggered rebuild only.
- Draft preview infrastructure (admin handles its own preview; site only renders `is_published = true`).
- Multi-image galleries per post (single hero + thumbnail only).
- Migration of existing Markdown placeholders — **the 30 files in `src/content/posts/` will be deleted; they hold no real content.**

## 4. Architecture decisions (locked)

| # | Area | Decision |
|---|---|---|
| 1 | Source of truth | Supabase. Existing placeholder MDs deleted. |
| 2 | Fetch strategy | Build-time fetch via Astro Content Loader. Static output. |
| 3 | API surface | Custom Content Loader (`defineCollection({ loader, schema })`). Pages use `getCollection()`. |
| 4 | Collection shape | Flat: one entry per `(post, lang)`. EN entry only if admin has a non-empty translation row. |
| 5 | URL slugs | Admin-defined, per-language. No legacy redirect map (placeholder MDs ⇒ no live URLs to preserve). |
| 6 | Content format | HTML in DB, rendered with `<Fragment set:html />`. |
| 7 | Language switcher | When EN translation absent: toggle visible but disabled, tooltip "Not yet translated". |
| 8 | Image pipeline | Astro `<Image>` component with `image.remotePatterns` for `*.supabase.co`. Update `src/components/ui/Image.astro`. |
| 9 | Categories | Loaded as a separate collection from Supabase (`categories` + `category_translations`). Replace 4+ inline hardcoded arrays. |
| 10 | Keywords | Slugified in loader (lowercase + diacritic strip + dash-join). Loaded as a third collection (slug → label per lang + post refs). |
| 11 | Image fields | Single `image` + `thumbnail`. Drop `images[]` array and dead grid logic in `[...slug].astro`. |
| 12 | Build trigger | Supabase Database Webhook → Vercel Deploy Hook. Fires on insert/update/delete of `posts`, `post_translations`, `post_keywords`, `post_references`, `images`, `categories`, `category_translations`. |
| 13 | Hosting | Vercel. |
| 14 | Local dev | Astro content layer cache + digest-based incremental sync. `.env.local` required; cache fallback when offline. |
| 15 | Drafts | Strict. Loader filters `is_published = true`. No preview deployment. |
| 16 | Env vars | Server-only `SUPABASE_URL` + `SUPABASE_ANON_KEY` (no `PUBLIC_` prefix). Loader runs in Node at build time only. RLS policy gates client-visible rows. |
| 17 | Types | `pnpm types:gen` runs `supabase gen types typescript --project-id ... > src/lib/database.types.ts`. Output committed. |
| 18 | Validation | Hybrid. Hard-fail on missing title/slug/content/category/category-FK. Soft-fallback on missing alt (use title), missing thumbnail (use main image), missing image (omit hero figure). |
| 19 | Sanitization | Defense-in-depth. Admin sanitizes on write; Astro loader sanitizes on read with `sanitize-html` allowlist matching the editor's tag set. |
| 20 | SEO surfaces | Add `@astrojs/sitemap` (multi-locale). Add per-language RSS feeds (`/ca/rss.xml`, `/en/rss.xml`). |
| 21 | Post ordering | `posts.sort_order ASC, date DESC` (tiebreaker). Requires admin schema change. |

## 5. Schema changes required in admin (Supabase)

Outside this repo, but blocking integration:

1. **`posts.sort_order INTEGER NOT NULL DEFAULT 0`** — index recommended. Admin UI gets a sort field or drag-to-reorder.
2. **RLS policy** on read tables (`posts`, `post_translations`, `post_keywords`, `keywords`, `post_references`, `images`, `categories`, `category_translations`, `languages`): `SELECT` allowed for `anon` role on rows where the parent post has `is_published = true`. (Decide cascade-via-view vs per-table policies during implementation.)
3. **Webhook**: outbound DB webhook → Vercel deploy hook URL, signed with shared secret, on the seven tables above. Vercel rebuild coalescing handles bursts.

## 6. Content model (Astro side)

### `posts` collection — entry shape (after Zod parse)

```ts
{
  id: string;                 // post UUID from Supabase
  lang: 'ca' | 'en';          // this entry's language
  slug: string;               // human slug, unique within lang
  title: string;
  content: string;            // sanitized HTML
  date: string;               // ISO date
  author: string;
  category: { id: string; slug: string };
  image:     { url: string; alt: string; title: string } | null;
  thumbnail: { url: string; alt: string; title: string } | null;
  keywords:  { slug: string; label: string }[];
  references: {
    type: 'image' | 'text';
    reference: string;
    blockquote: string;
    sort_order: number;
  }[];
  availableLangs: ('ca' | 'en')[];   // for the language switcher (Q7b)
  sort_order: number;
}
```

### `categories` collection

```ts
{ id: string; slug: 'vivencies' | 'influencies' | 'perspectives'; name: { ca: string; en: string } }
```

### `keywords` collection

```ts
{ slug: string; lang: 'ca' | 'en'; label: string; postSlugs: string[] }
```

## 7. Routing changes

Add EN counterparts to existing CA routes (currently CA-only):

```
/en/reflexions/                       — index, paginated
/en/reflexions/[category]/            — category index
/en/reflexions/keyword/[keyword]/     — keyword index (slug from Q10)
/en/reflexions/[slug]                 — post page
```

Use the same path component on CA (`paraula-clau`) translated to `keyword` on EN, via the existing `getLocalizedPath` helper. Pagination preserved (current `pageSize: 6`).

## 8. Files affected (summary)

| Path | Change |
|------|--------|
| `package.json` | Add deps: `@supabase/supabase-js`, `sanitize-html`, `@astrojs/sitemap`, `@astrojs/rss`, `slugify`. Add scripts: `types:gen`, optionally `content:sync`. |
| `astro.config.mjs` | Add `sitemap()` integration. Configure `image.remotePatterns` for Supabase Storage. |
| `src/content/config.ts` | Replace MD `posts` schema with Supabase-loader collections (`posts`, `categories`, `keywords`). |
| `src/lib/supabase.ts` (new) | Supabase client init from `SUPABASE_URL` + `SUPABASE_ANON_KEY`. |
| `src/lib/loaders/posts.ts` (new) | Custom Content Loader. Fetch + transform + sanitize + Zod-validate. |
| `src/lib/loaders/categories.ts` (new) | Categories loader. |
| `src/lib/loaders/keywords.ts` (new) | Derive keywords collection (slugify) from `post_keywords` join. |
| `src/lib/database.types.ts` (new, generated) | `pnpm types:gen` output. |
| `src/lib/sanitize.ts` (new) | `sanitize-html` config. Allowlist depends on admin's editor (TBD). |
| `src/components/ui/Image.astro` | Switch raw `<img>` to Astro's `<Image>` (or wrap, preserving the existing API). |
| `src/components/app/PostGrid.astro` | Read `thumbnail` (was `portraitImage`). Use category collection. |
| `src/pages/ca/reflexions/[...page].astro` | Drop hardcoded categories; use category collection. Filter by `lang === 'ca'`. |
| `src/pages/ca/reflexions/[category]/[...page].astro` | Same. |
| `src/pages/ca/reflexions/paraula-clau/[keyword]/[...page].astro` | Use keyword slug from collection. |
| `src/pages/ca/reflexions/[...slug].astro` | Drop `images[]` grid. Render `<Fragment set:html={content}>`. References use new shape. Same. |
| `src/pages/en/reflexions/...` (new, 4 files) | Mirror CA routes. |
| `src/pages/ca/rss.xml.ts`, `src/pages/en/rss.xml.ts` (new) | Per-language RSS. |
| `src/content/posts/*.md` | **Delete all 30 placeholder files.** |
| `.env.example` (new/updated) | `SUPABASE_URL=`, `SUPABASE_ANON_KEY=`. |
| `README.md` | Document env setup, `pnpm types:gen`, deploy hook configuration. |

## 9. Implementation phases

### Phase 0 — admin prerequisites (blocks Phase 2+)

- Add `posts.sort_order` column + admin UI.
- Add RLS policies for anon read on published rows.
- Confirm rich text editor identity → finalize sanitize allowlist (Q21 TBD).
- Provision Supabase project access + service role key (only for type generation if needed).

### Phase 1 — site scaffolding (no admin dependency yet)

- Install dependencies.
- Configure `astro.config.mjs` (sitemap + remotePatterns).
- Refactor `Image.astro` to Astro `<Image>`.
- Drop `images[]` array from existing schema; reduce to single image (run before deletion to validate refactor).

### Phase 2 — Supabase loader + collections

- `pnpm types:gen` against admin's Supabase project.
- Build `lib/supabase.ts`, `lib/loaders/posts.ts`, `categories.ts`, `keywords.ts`.
- Define Zod schemas, hard/soft validation per Q19.
- Wire `sanitize-html` per Q20.

### Phase 3 — pages refactor

- Replace hardcoded category arrays with `getCollection('categories')`.
- Update `[...slug].astro` to render HTML content + new reference shape.
- Update keyword/category list pages to filter by `lang`.
- Add `/en/reflexions/*` routes (mirror CA).
- Add language switcher logic for missing-translation case (Q7b).

### Phase 4 — SEO + dev experience

- `@astrojs/sitemap` config (multi-locale).
- Per-language RSS endpoints.
- Local cache fallback for offline dev.
- Empty-state UX on listings (zero published posts day one).

### Phase 5 — production

- Seed Supabase with 1 sample post (CA + EN) to verify pipeline end-to-end.
- Configure Vercel project + deploy hook URL.
- Configure Supabase webhook → deploy hook (with signing secret).
- Delete `src/content/posts/*.md`.
- Verify build, sitemap, RSS, language switcher, image optimization.
- Cut over.

## 10. Open TBDs

1. **Rich text editor identity** in admin (TipTap / Lexical / Quill / other). Decides sanitize allowlist concrete tag set. Block on Phase 2.
2. **Webhook signing**: shared secret format, header name. Block on Phase 5.
3. **Date display format** on post pages. Currently no date is shown. Recommend `DD/MM/YYYY` (CA convention) and `YYYY-MM-DD` or locale-formatted on EN. Confirm before Phase 3.
4. **Empty-state copy** for `/reflexions` listings on day one when zero posts published. Localized strings needed in `src/i18n/{ca,en}.ts`.
5. **RLS policy granularity**: per-table policies vs reading from a published-only view. Pick during Phase 0.

## 11. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Rich text editor outputs unsafe HTML | Sanitize at admin write + at loader read (Q20). Allowlist matches editor capabilities. |
| Build fails mid-publish (e.g. typo in admin) | Hybrid validation (Q19): hard-fail only on render-blocking fields. Soft fields use fallbacks. |
| Build cost blows up with many posts | Astro content layer cache + digest sync (Q15) skips unchanged entries. Monitor first. |
| Image fetch flakes during build | Astro caches optimized images; rerun resumes. If persistent, add retry in loader. |
| Toni accidentally publishes a draft | Strict `is_published` filter (Q16). Admin UI confirms publish. |
| Supabase outage during build | `astro build` fails fast; cache fallback (Q15) supports local dev only, not prod. Acceptable for static blog — site stays up; rebuild deferred. |
| Schema drift between admin and Astro | `pnpm types:gen` re-run committed; CI can diff against current. Zod schema catches runtime drift. |

## 12. Success criteria

- `astro build` produces a static site fed entirely from Supabase.
- Single seed post renders correctly in CA + EN: title, body HTML, hero image (optimized), thumbnail in grid, category breadcrumb, keywords listing, references list.
- Sitemap lists CA and EN URLs.
- RSS feeds parse in a reader.
- Publishing a change in admin triggers a Vercel rebuild within ~60s and propagates to the live site.
- Build fails clearly when a published post is missing critical fields.
- Lighthouse score on a post page ≥ current baseline (image optimization should improve LCP).
