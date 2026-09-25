import {
  catalogSchema,
  postSchema,
  postsPageSchema,
  revisionSchema,
  type Catalog,
  type Environment,
  type PublishedPost,
  type ReaderRequest,
} from './contract';
import { ReaderFailure, createReaderClient, readerConfig, type ReaderTransport } from './client';

export type PublishedSnapshot = { revision: number; catalog: Catalog; posts: PublishedPost[] };

function parse<T>(schema: { parse(value: unknown): T }, value: unknown, name: string): T {
  try {
    return schema.parse(value);
  } catch {
    throw new ReaderFailure(`Malformed build reader ${name}`);
  }
}

function unique(value: string, seen: Set<string>, name: string): void {
  if (seen.has(value)) throw new ReaderFailure(`Duplicate ${name}`);
  seen.add(value);
}

function validateCatalog(catalog: Catalog): void {
  const categoryIds = new Set<string>();
  const categorySlugs = new Set<string>();
  for (const category of catalog.categories) {
    unique(category.id, categoryIds, 'category ID');
    unique(category.slug, categorySlugs, 'category slug');
  }
  const keywordIds = new Set<string>();
  for (const keyword of catalog.keywords) unique(keyword.id, keywordIds, 'keyword ID');
}

const privateUrl = /(?:s3:\/\/|amazonaws\.com|[?&]X-Amz-|AWS4-HMAC-SHA256)/i;

function validateLinks(snapshot: PublishedSnapshot): void {
  if (privateUrl.test(JSON.stringify(snapshot))) {
    throw new ReaderFailure('Private URL in published content');
  }
  const categories = new Map(snapshot.catalog.categories.map((c) => [c.id, c]));
  const keywords = new Map(snapshot.catalog.keywords.map((k) => [k.id, k]));
  const routeSlugs = new Set<string>();
  for (const post of snapshot.posts) {
    const category = categories.get(post.category.id);
    if (!category || category.slug !== post.category.slug)
      throw new ReaderFailure('Missing category catalog link');
    for (const lang of ['ca', 'en'] as const) {
      const translation = post.translations[lang];
      const seenKeywords = new Set<string>();
      const seenReferences = new Set<string>();
      for (const keyword of translation.keywords) {
        unique(keyword.id, seenKeywords, 'post keyword ID');
        const catalogKeyword = keywords.get(keyword.id);
        if (!catalogKeyword || catalogKeyword.language !== lang) {
          throw new ReaderFailure('Missing keyword catalog link');
        }
      }
      for (const reference of translation.references)
        unique(reference.id, seenReferences, 'reference ID');
      if (translation.title && translation.slug && translation.content) {
        unique(`${lang}/${translation.slug}`, routeSlugs, 'language/slug route');
      }
    }
  }
}

async function boundedMap<T, U>(
  items: T[],
  width: number,
  fn: (item: T) => Promise<U>
): Promise<U[]> {
  const result = new Array<U>(items.length);
  let next = 0;
  let failed = false;
  let firstError: unknown;
  await Promise.all(
    Array.from({ length: Math.min(width, items.length) }, async () => {
      while (!failed && next < items.length) {
        const index = next++;
        try {
          result[index] = await fn(items[index]);
        } catch (error) {
          failed = true;
          firstError = error;
        }
      }
    })
  );
  if (failed) throw firstError;
  return result;
}

export async function fetchPublishedSnapshot(
  reader: ReaderTransport,
  environment: Environment
): Promise<PublishedSnapshot> {
  type RequestBody =
    | { operation: 'revision' | 'catalog' }
    | { operation: 'posts'; limit: 50; cursor?: string }
    | { operation: 'post'; id: string; expectedVersion: number };
  const invoke = (request: RequestBody) =>
    reader.invoke({ version: 1, environment, ...request } as ReaderRequest);

  for (let snapshotAttempt = 0; snapshotAttempt < 3; snapshotAttempt++) {
    try {
      const before = parse(
        revisionSchema,
        await invoke({ operation: 'revision' }),
        'revision'
      ).revision;
      const catalog = parse(catalogSchema, await invoke({ operation: 'catalog' }), 'catalog');
      validateCatalog(catalog);

      const ids: Array<{ id: string; version: number }> = [];
      const seenIds = new Set<string>();
      const seenCursors = new Set<string>();
      let cursor: string | undefined;
      do {
        const page = parse(
          postsPageSchema,
          await invoke({ operation: 'posts', limit: 50, ...(cursor ? { cursor } : {}) }),
          'posts page'
        );
        if (page.nextCursor && (page.items.length === 0 || page.nextCursor === cursor)) {
          throw new ReaderFailure('Non-progressing posts cursor');
        }
        for (const item of page.items) {
          unique(item.id, seenIds, 'published post ID');
          ids.push(item);
        }
        if (page.nextCursor) unique(page.nextCursor, seenCursors, 'posts cursor');
        cursor = page.nextCursor ?? undefined;
      } while (cursor);

      const posts = await boundedMap(ids, 4, async (item) => {
        const post = parse(
          postSchema,
          await invoke({ operation: 'post', id: item.id, expectedVersion: item.version }),
          'post detail'
        );
        if (post.id !== item.id || post.version !== item.version) {
          throw new ReaderFailure('Post detail ID/version mismatch', false, true);
        }
        return post;
      });
      const snapshot = { revision: before, catalog, posts };
      validateLinks(snapshot);
      const after = parse(
        revisionSchema,
        await invoke({ operation: 'revision' }),
        'revision'
      ).revision;
      if (after !== before) throw new ReaderFailure('Published revision changed', false, true);
      return snapshot;
    } catch (error) {
      if (!(error instanceof ReaderFailure) || !error.snapshotRetry || snapshotAttempt === 2)
        throw error;
    }
  }
  throw new ReaderFailure('Published snapshot retries exhausted');
}

export function getPublishedSnapshot(): Promise<PublishedSnapshot> {
  const config = readerConfig({ ...import.meta.env, ...process.env });
  return fetchPublishedSnapshot(createReaderClient(config), config.environment);
}
