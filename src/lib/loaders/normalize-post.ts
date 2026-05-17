import {
  LANG_BY_ID,
  type Lang,
  type PostEntry,
  type RawJoinedPost,
  type RawJoinedTranslation,
  type Reference,
} from './types';
import { validatePostRow } from './validate';

// Phase 1 stop-gap: posts without any image in Supabase fall back to this asset
// so the build doesn't drop them. Remove once admin attaches real images.
const PLACEHOLDER_IMAGE_URL = '/images/inici_img.webp';
const PLACEHOLDER_IMAGE_ALT = 'Imatge no disponible';

type Sanitize = (html: string) => string;

export interface NormalizeInput {
  rows: RawJoinedPost[];
  kwMap: Map<number, string[]>;
  refMap: Map<number, Reference[]>;
  sanitize: Sanitize;
}

function isUsable(t: RawJoinedTranslation): t is RawJoinedTranslation & {
  title: string;
  slug: string;
  content: string;
} {
  return !!t.title && !!t.slug && !!t.content;
}

export function normalizePosts({ rows, kwMap, refMap, sanitize }: NormalizeInput): PostEntry[] {
  const allErrors: string[] = [];
  const entries: PostEntry[] = [];

  for (const post of rows) {
    const result = validatePostRow(post);
    if (!result.ok) {
      allErrors.push(...result.errors);
      continue;
    }

    const categorySlug = post.category!.slug;

    const translationsByLang = new Map<Lang, RawJoinedTranslation>();
    for (const t of post.post_translations ?? []) {
      const lang = LANG_BY_ID[t.language_id];
      if (lang && isUsable(t)) translationsByLang.set(lang, t);
    }

    const availableLangs: Lang[] = (['ca', 'en'] as Lang[]).filter((l) =>
      translationsByLang.has(l)
    );

    const heroSource = post.image;
    const thumbSource = post.thumbnail ?? post.image;

    for (const lang of availableLangs) {
      const tr = translationsByLang.get(lang)!;

      const heroImage = heroSource
        ? { url: heroSource.url, alt: heroSource.alt || heroSource.title || tr.title }
        : undefined;
      const thumbnail = thumbSource
        ? { url: thumbSource.url, alt: thumbSource.alt || thumbSource.title || tr.title }
        : { url: PLACEHOLDER_IMAGE_URL, alt: PLACEHOLDER_IMAGE_ALT };

      entries.push({
        id: `${post.id}-${lang}`,
        slug: tr.slug,
        title: tr.title,
        date: post.date,
        category: categorySlug,
        html: sanitize(tr.content),
        image: heroImage,
        thumbnail,
        references: refMap.get(tr.id) ?? [],
        keywords: kwMap.get(tr.id) ?? [],
        sort_order: post.sort_order ?? 0,
        lang,
        availableLangs,
      });
    }
  }

  if (allErrors.length > 0) {
    throw new Error(
      `Invalid post rows from Supabase (${allErrors.length} error${allErrors.length === 1 ? '' : 's'}):\n  - ${allErrors.join('\n  - ')}`
    );
  }

  entries.sort(
    (a, b) =>
      a.sort_order - b.sort_order || new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return entries;
}
