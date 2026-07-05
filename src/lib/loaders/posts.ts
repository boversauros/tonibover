import type { Loader } from 'astro/loaders';
import { paragraphify } from '../paragraphify';
import { sanitize } from '../sanitize';
import { fetchPosts } from './fetch-posts';
import { groupReferencesByTranslation } from './normalize-references';
import { normalizePosts } from './normalize-post';
import type { PostEntry, RawPostKeywordRow } from './types';

function groupKeywordsByTranslation(rows: RawPostKeywordRow[]): Map<number, string[]> {
  const map = new Map<number, string[]>();
  for (const row of rows) {
    const kw = Array.isArray(row.keywords) ? row.keywords[0]?.keyword : row.keywords?.keyword;
    if (!kw) continue;
    const arr = map.get(row.post_translation_id) ?? [];
    arr.push(kw);
    map.set(row.post_translation_id, arr);
  }
  return map;
}

export function postsLoader(): Loader {
  return {
    name: 'tonibover-posts',
    async load({ store, logger, parseData, generateDigest }) {
      try {
        const { rows, kwRows, refRows } = await fetchPosts();
        const kwMap = groupKeywordsByTranslation(kwRows);
        const refMap = groupReferencesByTranslation(refRows);
        const entries: PostEntry[] = normalizePosts({
          rows,
          kwMap,
          refMap,
          sanitize: (content) => sanitize(paragraphify(content)),
        });

        store.clear();
        for (const entry of entries) {
          const data = await parseData({
            id: entry.id,
            data: entry as unknown as Record<string, unknown>,
          });
          store.set({ id: entry.id, data, digest: generateDigest(data) });
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          logger.warn(
            `[posts] fetch failed, keeping cached entries: ${err instanceof Error ? err.message : String(err)}`
          );
          return;
        }
        throw err;
      }
    },
  };
}
