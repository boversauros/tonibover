import { paragraphify } from '../paragraphify';
import { sanitize } from '../sanitize';
import { slugify } from '../slugify';
import type { PostEntry, Lang } from '../loaders/types';
import type { PublishedSnapshot } from './snapshot';
import type { Catalog, PublishedPost } from './contract';

export type CategoryEntry = { id: string; slug: string; name: { ca: string; en: string } };
export type KeywordEntry = {
  id: string;
  slug: string;
  lang: Lang;
  label: string;
  postIds: string[];
};
export type SiteEntries = {
  posts: PostEntry[];
  categories: CategoryEntry[];
  keywords: KeywordEntry[];
};
export type ImagePath = (post: PublishedPost, role: 'main' | 'thumb') => string;

const PLACEHOLDER = { url: '/images/inici_img.webp', alt: 'Imatge no disponible' };

function localImage(
  post: PublishedPost,
  role: 'main' | 'thumb',
  title: string,
  imagePath: ImagePath
): { url: string; alt: string } | undefined {
  const image = role === 'main' ? post.mainImage : post.thumbImage;
  if (!image) return undefined;
  const url = imagePath(post, role);
  if (!/^\/content-images\/[A-Za-z0-9._-]+$/.test(url)) {
    throw new Error('Published image requires a stable local content path');
  }
  return { url, alt: image.alt || image.title || title };
}

function numericAwareId(a: string, b: string): number {
  const decimal = /^\d+$/;
  const aNumeric = decimal.test(a);
  const bNumeric = decimal.test(b);
  if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
  if (aNumeric) {
    const left = BigInt(a),
      right = BigInt(b);
    if (left !== right) return left < right ? -1 : 1;
  }
  return a < b ? -1 : a > b ? 1 : 0;
}

function keywordEntries(
  catalog: Catalog,
  posts: PostEntry[],
  rawPosts: PublishedPost[]
): KeywordEntry[] {
  const catalogById = new Map(catalog.keywords.map((keyword) => [keyword.id, keyword]));
  const buckets = new Map<
    string,
    { lang: Lang; slug: string; ids: string[]; postIds: Set<string> }
  >();
  for (const keyword of catalog.keywords) {
    const slug = slugify(keyword.value);
    if (!slug) continue;
    const key = `${keyword.language}-${slug}`;
    const bucket = buckets.get(key) ?? {
      lang: keyword.language,
      slug,
      ids: [],
      postIds: new Set<string>(),
    };
    bucket.ids.push(keyword.id);
    buckets.set(key, bucket);
  }
  const emitted = new Set(posts.map((post) => post.id));
  for (const post of rawPosts) {
    for (const lang of ['ca', 'en'] as const) {
      const postId = `${post.id}-${lang}`;
      if (!emitted.has(postId)) continue;
      for (const keyword of post.translations[lang].keywords) {
        const catalogKeyword = catalogById.get(keyword.id)!;
        const slug = slugify(catalogKeyword.value);
        const bucket = buckets.get(`${lang}-${slug}`);
        if (!slug || !bucket) throw new Error('Published keyword has no usable URL slug');
        bucket.postIds.add(postId);
      }
    }
  }
  return [...buckets.values()]
    .filter((bucket) => bucket.postIds.size > 0)
    .map((bucket) => {
      const labelId = [...bucket.ids].sort(numericAwareId)[0];
      return {
        id: `${bucket.lang}-${bucket.slug}`,
        slug: bucket.slug,
        lang: bucket.lang,
        label: catalogById.get(labelId)!.value,
        postIds: [...bucket.postIds],
      };
    });
}

export function adaptSnapshot(
  snapshot: PublishedSnapshot,
  imagePath: ImagePath = () => {
    throw new Error('Published image materialization is required');
  }
): SiteEntries {
  const posts: PostEntry[] = [];
  for (const post of snapshot.posts) {
    const usable = (['ca', 'en'] as Lang[]).filter((lang) => {
      const translation = post.translations[lang];
      return Boolean(translation.title && translation.slug && translation.content);
    });
    if (usable.length === 0) throw new Error(`Post ${post.id} has no usable translation`);
    for (const lang of usable) {
      const translation = post.translations[lang];
      const image = localImage(post, 'main', translation.title, imagePath);
      const thumbnail =
        localImage(post, 'thumb', translation.title, imagePath) ?? image ?? PLACEHOLDER;
      const references = [...translation.references]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((reference) => ({
          type: reference.type,
          reference: reference.reference,
          blockquote: reference.blockquote ?? null,
          sort_order: reference.sortOrder,
        }));
      const keywordLabels = translation.keywords.map((keyword) => {
        const catalogKeyword = snapshot.catalog.keywords.find((item) => item.id === keyword.id);
        if (!catalogKeyword) throw new Error('Missing keyword catalog link');
        return catalogKeyword.value;
      });
      posts.push({
        id: `${post.id}-${lang}`,
        slug: translation.slug,
        title: translation.title,
        date: post.date,
        category: post.category.slug,
        html: sanitize(paragraphify(translation.content)),
        image,
        thumbnail,
        references,
        keywords: keywordLabels,
        sort_order: post.sortOrder,
        lang,
        availableLangs: usable,
      });
    }
  }
  posts.sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      new Date(b.date).getTime() - new Date(a.date).getTime() ||
      a.id.localeCompare(b.id)
  );
  const categories: CategoryEntry[] = snapshot.catalog.categories.map((category) => ({
    id: category.slug,
    slug: category.slug,
    name: category.names,
  }));
  return { posts, categories, keywords: keywordEntries(snapshot.catalog, posts, snapshot.posts) };
}
