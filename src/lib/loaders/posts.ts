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

export function postsLoader() {
  return async (): Promise<PostEntry[]> => {
    const { rows, kwRows, refRows } = await fetchPosts();
    const kwMap = groupKeywordsByTranslation(kwRows);
    const refMap = groupReferencesByTranslation(refRows);
    return normalizePosts({ rows, kwMap, refMap, sanitize });
  };
}
