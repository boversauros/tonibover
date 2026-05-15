import sanitizeHtml from 'sanitize-html';
import { supabase } from '../supabase';

const CA_LANGUAGE_ID = 1;

type Lang = 'ca';

interface RawImage {
  id: number;
  url: string;
  title: string | null;
  alt: string | null;
}

interface RawTranslation {
  id: number;
  language_id: number;
  title: string | null;
  slug: string | null;
  content: string | null;
}

interface RawPostRow {
  id: number;
  category_id: number;
  is_published: boolean;
  date: string;
  sort_order: number | null;
  category: { slug: string } | null;
  post_translations: RawTranslation[];
  thumbnail: RawImage | null;
  image: RawImage | null;
}

interface PostEntry {
  id: string;
  slug: string;
  title: string;
  date: string;
  category: string;
  html: string;
  image?: { url: string; alt: string };
  thumbnail: { url: string; alt: string };
  references: Array<{
    type: 'text' | 'image' | 'blockquote';
    reference: string;
    blockquote: string | null;
    sort_order: number;
  }>;
  keywords: string[];
  sort_order: number;
  lang: Lang;
}

// Phase 1 stop-gap: posts without any image in Supabase fall back to this asset
// so the build doesn't drop them. Remove once admin attaches real images.
const PLACEHOLDER_IMAGE_URL = '/images/inici_img.webp';
const PLACEHOLDER_IMAGE_ALT = 'Imatge no disponible';

// Phase 1: sanitize with library defaults plus a couple of common rich-text tags.
// Phase 4 tightens this allowlist against the admin's actual editor output.
function sanitize(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img',
      'h1',
      'h2',
      'figure',
      'figcaption',
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'title'],
    },
  });
}

export function postsLoader() {
  return async (): Promise<PostEntry[]> => {
    const { data: posts, error } = await supabase
      .from('posts')
      .select(
        `id, category_id, is_published, date, sort_order,
         category:categories(slug),
         post_translations(id, language_id, title, slug, content),
         thumbnail:images!posts_thumbnail_id_fkey(id, url, title, alt),
         image:images!posts_image_id_fkey(id, url, title, alt)`
      )
      .eq('is_published', true);

    if (error) throw error;
    if (!posts?.length) return [];

    const rows = posts as unknown as RawPostRow[];

    const caTranslationIds = rows.flatMap((p) =>
      (p.post_translations ?? []).filter((t) => t.language_id === CA_LANGUAGE_ID).map((t) => t.id)
    );

    const [kwResult, refResult] = await Promise.all([
      supabase
        .from('post_keywords')
        .select('post_translation_id, keywords(keyword)')
        .in('post_translation_id', caTranslationIds),
      supabase
        .from('post_references')
        .select('id, post_translation_id, type, reference, blockquote, sort_order')
        .in('post_translation_id', caTranslationIds)
        .order('sort_order', { ascending: true }),
    ]);
    if (kwResult.error) throw kwResult.error;
    if (refResult.error) throw refResult.error;

    const kwMap = new Map<number, string[]>();
    for (const row of kwResult.data ?? []) {
      const r = row as {
        post_translation_id: number;
        keywords: { keyword: string } | { keyword: string }[] | null;
      };
      const arr = kwMap.get(r.post_translation_id) ?? [];
      const kw = Array.isArray(r.keywords) ? r.keywords[0]?.keyword : r.keywords?.keyword;
      if (kw) arr.push(kw);
      kwMap.set(r.post_translation_id, arr);
    }

    const refMap = new Map<number, PostEntry['references']>();
    for (const row of refResult.data ?? []) {
      const r = row as {
        post_translation_id: number;
        type: 'text' | 'image' | 'blockquote';
        reference: string;
        blockquote: string | null;
        sort_order: number;
      };
      const arr = refMap.get(r.post_translation_id) ?? [];
      arr.push({
        type: r.type,
        reference: r.reference,
        blockquote: r.blockquote,
        sort_order: r.sort_order,
      });
      refMap.set(r.post_translation_id, arr);
    }

    const entries: PostEntry[] = [];
    for (const post of rows) {
      const ca = post.post_translations?.find((t) => t.language_id === CA_LANGUAGE_ID);
      if (!ca?.title || !ca.slug || !ca.content) continue;

      const categorySlug = post.category?.slug;
      if (!categorySlug) continue;

      const heroSource = post.image;
      const thumbSource = post.thumbnail ?? post.image;

      const heroImage = heroSource
        ? { url: heroSource.url, alt: heroSource.alt || heroSource.title || ca.title }
        : undefined;
      const thumbnail = thumbSource
        ? { url: thumbSource.url, alt: thumbSource.alt || thumbSource.title || ca.title }
        : { url: PLACEHOLDER_IMAGE_URL, alt: PLACEHOLDER_IMAGE_ALT };

      entries.push({
        id: String(post.id),
        slug: ca.slug,
        title: ca.title,
        date: post.date,
        category: categorySlug,
        html: sanitize(ca.content),
        image: heroImage,
        thumbnail,
        references: refMap.get(ca.id) ?? [],
        keywords: kwMap.get(ca.id) ?? [],
        sort_order: post.sort_order ?? 0,
        lang: 'ca',
      });
    }

    return entries;
  };
}
