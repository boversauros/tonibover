import sanitizeHtml from 'sanitize-html';
import { supabase } from '../supabase';

const CA_LANGUAGE_ID = 1;
const EN_LANGUAGE_ID = 2;

type Lang = 'ca' | 'en';

const LANG_BY_ID: Record<number, Lang> = {
  [CA_LANGUAGE_ID]: 'ca',
  [EN_LANGUAGE_ID]: 'en',
};

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
  availableLangs: Lang[];
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

function isUsable(t: RawTranslation | undefined): t is RawTranslation & {
  title: string;
  slug: string;
  content: string;
} {
  return !!t && !!t.title && !!t.slug && !!t.content;
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

    const allTranslationIds = rows.flatMap((p) =>
      (p.post_translations ?? [])
        .filter((t) => LANG_BY_ID[t.language_id] !== undefined)
        .map((t) => t.id)
    );

    const [kwResult, refResult] = await Promise.all([
      supabase
        .from('post_keywords')
        .select('post_translation_id, keywords(keyword)')
        .in('post_translation_id', allTranslationIds),
      supabase
        .from('post_references')
        .select('id, post_translation_id, type, reference, blockquote, sort_order')
        .in('post_translation_id', allTranslationIds)
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
      const categorySlug = post.category?.slug;
      if (!categorySlug) continue;

      const translationsByLang = new Map<Lang, RawTranslation>();
      for (const t of post.post_translations ?? []) {
        const lang = LANG_BY_ID[t.language_id];
        if (lang && isUsable(t)) translationsByLang.set(lang, t);
      }

      const availableLangs: Lang[] = (['ca', 'en'] as Lang[]).filter((l) =>
        translationsByLang.has(l)
      );
      if (availableLangs.length === 0) continue;

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

    entries.sort(
      (a, b) =>
        a.sort_order - b.sort_order || new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return entries;
  };
}
