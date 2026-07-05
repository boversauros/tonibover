# Astro Blog Integration — Context Doc

Use this file as context when setting up the Astro site that consumes content from this admin panel.

---

## Overview

This admin is a **Next.js** app that manages blog posts for **Toni Bover** stored in **Supabase (PostgreSQL)**. The Astro site should pull data from Supabase at **build time** and generate static markdown/pages.

---

## Environment Variables Needed (Astro site)

```env
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Same values as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the admin `.env`.

---

## Supabase Database Schema

### Tables

| Table                   | Key Columns                                                                       | Notes                                      |
| ----------------------- | --------------------------------------------------------------------------------- | ------------------------------------------ |
| `posts`                 | `id`, `category_id`, `thumbnail_id`, `image_id`, `author`, `date`, `is_published` | Root post record                           |
| `post_translations`     | `id`, `post_id`, `language_id`, `title`, `slug`, `content`                        | language_id: 1=CA, 2=EN                    |
| `post_keywords`         | `post_translation_id`, `keyword_id`                                               | Junction table                             |
| `keywords`              | `id`, `keyword`, `language_id`                                                    | Shared keyword bank                        |
| `post_references`       | `id`, `post_translation_id`, `type`, `reference`, `blockquote`, `sort_order`      | type: 'image' or 'text'                    |
| `categories`            | `id`, `slug`                                                                      | slug: vivencies, influencies, perspectives |
| `category_translations` | `category_id`, `language_id`, `name`                                              | Localized category names                   |
| `images`                | `id`, `url`, `title`, `alt`                                                       | Supabase Storage URLs                      |
| `languages`             | `id`, `code`, `name`                                                              | 1=ca (Catalan), 2=en (English)             |

### Language IDs

```
1 = ca (Catalan) — primary language
2 = en (English)
```

---

## TypeScript Types

```typescript
export type Language = 'ca' | 'en';
export type ReferenceType = 'image' | 'text';

export interface Image {
  id: string;
  url: string;
  title: string;
  alt: string;
  created_at: string;
  updated_at: string;
}

export interface Reference {
  id: string;
  type: ReferenceType; // 'image' | 'text'
  reference: string; // URL for image, citation text for text
  blockquote: string; // quote text
  sort_order: number;
}

export interface PostTranslation {
  language: Language;
  title: string;
  content: string; // HTML or rich text
  slug: string;
  keywords: string[];
  references: Reference[];
}

export interface StoredPost {
  id: string;
  user_id: string;
  category_id: string;
  thumbnail_id: string | null;
  thumbnail?: Image | null;
  image_id: string | null;
  image?: Image | null;
  is_published: boolean;
  date: string; // ISO date string
  author: string;
  created_at: string;
  updated_at: string;
  translations: {
    ca: PostTranslation & { post_id: string };
    en: PostTranslation & { post_id: string };
  };
}
```

---

## Supabase Fetch Query (copy into Astro)

Install: `npm install @supabase/supabase-js`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

export async function getAllPosts() {
  const { data: posts, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      post_translations (id, language_id, title, content, slug),
      thumbnail:images!posts_thumbnail_id_fkey (id, url, title, alt),
      image:images!posts_image_id_fkey (id, url, title, alt)
    `
    )
    .eq('is_published', true)
    .order('date', { ascending: false });

  if (error) throw error;
  if (!posts?.length) return [];

  const translationIds = posts.flatMap((p) => p.post_translations?.map((t: any) => t.id) ?? []);

  const [{ data: kwData }, { data: refData }] = await Promise.all([
    supabase
      .from('post_keywords')
      .select('post_translation_id, keywords(keyword)')
      .in('post_translation_id', translationIds),
    supabase
      .from('post_references')
      .select('*')
      .in('post_translation_id', translationIds)
      .order('sort_order', { ascending: true }),
  ]);

  const kwMap = new Map<number, string[]>();
  kwData?.forEach((pk: any) => {
    const arr = kwMap.get(pk.post_translation_id) ?? [];
    arr.push(pk.keywords.keyword);
    kwMap.set(pk.post_translation_id, arr);
  });

  const refMap = new Map<number, any[]>();
  refData?.forEach((ref: any) => {
    const arr = refMap.get(ref.post_translation_id) ?? [];
    arr.push(ref);
    refMap.set(ref.post_translation_id, arr);
  });

  return posts.map((post: any) => {
    const translations = post.post_translations ?? [];
    const ca = translations.find((t: any) => t.language_id === 1);
    const en = translations.find((t: any) => t.language_id === 2);

    const mapTranslation = (t: any, lang: 'ca' | 'en') => ({
      language: lang,
      post_id: String(post.id),
      title: t?.title ?? '',
      content: t?.content ?? '',
      slug: t?.slug ?? '',
      keywords: kwMap.get(t?.id) ?? [],
      references: refMap.get(t?.id) ?? [],
    });

    return {
      id: String(post.id),
      category_id: String(post.category_id),
      thumbnail: post.thumbnail ?? null,
      image: post.image ?? null,
      is_published: post.is_published,
      date: post.date,
      author: post.author,
      created_at: post.created_at,
      updated_at: post.updated_at,
      translations: {
        ca: mapTranslation(ca, 'ca'),
        en: mapTranslation(en, 'en'),
      },
    };
  });
}
```

---

## Categories

3 categories exist:

| id  | slug         | name_ca      | name_en      |
| --- | ------------ | ------------ | ------------ |
| 1   | vivencies    | Vivències    | Experiences  |
| 2   | influencies  | Influències  | Influences   |
| 3   | perspectives | Perspectives | Perspectives |

Fetch categories:

```typescript
const { data: categories } = await supabase
  .from('categories')
  .select('id, slug, category_translations(language_id, name)')
  .order('id');
```

---

## Content Field: `content`

The `content` field in `post_translations` is stored as **HTML** (from a rich text editor in the admin). In Astro you can render it with `<Fragment set:html={post.content} />` or convert to markdown with a library like `turndown`.

---

## References

Each translation can have ordered references with:

- `type: 'image'` — `reference` is an image URL, `blockquote` is caption
- `type: 'text'` — `reference` is a citation/source, `blockquote` is the quoted text

Render after the post body or inline depending on design.

---

## Images

Images live in **Supabase Storage**. The `url` field is a full URL. Use directly in `<img src={post.thumbnail.url} alt={post.thumbnail.alt} />`.

Two image fields per post:

- `thumbnail` — card/list view image
- `image` — full hero/article image

---

## Astro Static Generation Patterns

### Option A: Supabase at Build Time (recommended)

Fetch in `getStaticPaths` for per-language post pages:

```typescript
// src/pages/[lang]/[slug].astro
export async function getStaticPaths() {
  const posts = await getAllPosts();
  return posts.flatMap((post) => [
    { params: { lang: 'ca', slug: post.translations.ca.slug }, props: { post, lang: 'ca' } },
    { params: { lang: 'en', slug: post.translations.en.slug }, props: { post, lang: 'en' } },
  ]);
}
```

### Option B: Generate Markdown Files at Build Time

Run a script (`scripts/generate-markdown.ts`) to write `.md` files into `src/content/posts/` before building:

```
src/content/posts/
  ca/
    post-slug.md
  en/
    post-slug.md
```

Each file frontmatter:

```yaml
---
id: '42'
title: 'Post Title'
slug: 'post-slug'
lang: 'ca'
date: '2024-01-15'
author: 'Toni Bover'
category_id: '1'
category_slug: 'vivencies'
is_published: true
keywords: ['keyword1', 'keyword2']
thumbnail_url: 'https://...'
thumbnail_alt: '...'
image_url: 'https://...'
image_alt: '...'
---
<!-- content HTML here -->
```

Then use Astro Content Collections to consume them.

---

## Astro Content Collection Schema (Option B)

```typescript
// src/content/config.ts
import { z, defineCollection } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
    lang: z.enum(['ca', 'en']),
    date: z.string(),
    author: z.string(),
    category_id: z.string(),
    category_slug: z.string(),
    is_published: z.boolean(),
    keywords: z.array(z.string()),
    thumbnail_url: z.string().nullable(),
    thumbnail_alt: z.string().nullable(),
    image_url: z.string().nullable(),
    image_alt: z.string().nullable(),
  }),
});

export const collections = { posts };
```

---

## Recommended Approach

**Use Option A (direct Supabase at build time)** if you want:

- No file generation step
- Always fresh on `astro build`
- Simpler pipeline

**Use Option B (markdown files)** if you want:

- Version-controlled content in git
- Astro Content Collections type safety
- Offline dev without Supabase connection

---

## URL Structure Suggestion

```
/ca/blog/[slug]     — Catalan posts
/en/blog/[slug]     — English posts
/ca/blog            — Catalan index
/en/blog            — English index
/ca/blog/categoria/[category-slug]
/en/blog/category/[category-slug]
```

---

## Admin → Astro Rebuild Trigger (optional)

Admin uses Supabase. To auto-rebuild the Astro site when content changes:

- Add a **Supabase Database Webhook** on `posts` table INSERT/UPDATE
- Point it at your Astro hosting deploy hook (Vercel/Netlify/Cloudflare)

---

## Key Files in This Admin Repo

| File                    | Purpose                                     |
| ----------------------- | ------------------------------------------- |
| `lib/types/post.ts`     | All TypeScript types                        |
| `lib/types/database.ts` | Auto-generated Supabase types               |
| `lib/api/posts.ts`      | Full fetch logic (reference for Astro port) |
| `lib/api/categories.ts` | Category fetch                              |
| `lib/supabase.ts`       | Supabase client init                        |
| `.env.example`          | Env var names needed                        |
