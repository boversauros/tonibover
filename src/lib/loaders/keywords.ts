import type { Loader } from 'astro/loaders';
import { supabase } from '../supabase';
import { slugify } from '../slugify';
import type { Tables } from '../database.types';
import { CA_LANGUAGE_ID, EN_LANGUAGE_ID, type Lang } from './types';

const LANGS: Array<{ id: number; code: Lang }> = [
  { id: CA_LANGUAGE_ID, code: 'ca' },
  { id: EN_LANGUAGE_ID, code: 'en' },
];

type KeywordRow = Pick<Tables<'keywords'>, 'id' | 'keyword' | 'language_id'>;
type TranslationRow = Pick<Tables<'post_translations'>, 'id' | 'post_id' | 'language_id'>;
type PostKeywordRow = Pick<Tables<'post_keywords'>, 'keyword_id' | 'post_translation_id'>;

interface KeywordEntry {
  id: string;
  slug: string;
  lang: Lang;
  label: string;
  postIds: string[];
}

async function fetchKeywordEntries(): Promise<KeywordEntry[]> {
  const [pubPostsRes, kwRes] = await Promise.all([
    supabase.from('posts').select('id').eq('is_published', true),
    supabase.from('keywords').select('id, keyword, language_id'),
  ]);
  if (pubPostsRes.error) throw pubPostsRes.error;
  if (kwRes.error) throw kwRes.error;

  const pubPostIds = (pubPostsRes.data ?? []).map((p) => p.id);
  if (pubPostIds.length === 0) return [];

  const { data: trans, error: tErr } = await supabase
    .from('post_translations')
    .select('id, post_id, language_id')
    .in('post_id', pubPostIds);
  if (tErr) throw tErr;

  const transInfo = new Map<number, { postId: number; languageId: number }>();
  for (const t of (trans ?? []) as TranslationRow[]) {
    transInfo.set(t.id, { postId: t.post_id, languageId: t.language_id });
  }
  const transIds = [...transInfo.keys()];
  if (transIds.length === 0) return [];

  const { data: pk, error: pkErr } = await supabase
    .from('post_keywords')
    .select('keyword_id, post_translation_id')
    .in('post_translation_id', transIds);
  if (pkErr) throw pkErr;

  const allKws = (kwRes.data ?? []) as KeywordRow[];
  const pkRows = (pk ?? []) as PostKeywordRow[];

  const entries: KeywordEntry[] = [];

  for (const { id: langId, code: lang } of LANGS) {
    const kws = allKws.filter((k) => k.language_id === langId);

    const kwToPosts = new Map<number, Set<string>>();
    for (const r of pkRows) {
      const info = transInfo.get(r.post_translation_id);
      if (!info || info.languageId !== langId) continue;
      const set = kwToPosts.get(r.keyword_id) ?? new Set<string>();
      set.add(`${info.postId}-${lang}`);
      kwToPosts.set(r.keyword_id, set);
    }

    type Bucket = { ids: number[]; postIds: Set<string> };
    const bySlug = new Map<string, Bucket>();
    for (const k of kws) {
      const slug = slugify(k.keyword);
      if (!slug) continue;
      const bucket = bySlug.get(slug) ?? { ids: [], postIds: new Set<string>() };
      bucket.ids.push(k.id);
      const posts = kwToPosts.get(k.id);
      if (posts) for (const pid of posts) bucket.postIds.add(pid);
      bySlug.set(slug, bucket);
    }

    for (const [slug, bucket] of bySlug) {
      if (bucket.postIds.size === 0) continue;
      const smallestId = bucket.ids.reduce((a, b) => (a < b ? a : b));
      const labelRow = kws.find((k) => k.id === smallestId);
      if (!labelRow) continue;
      entries.push({
        id: `${lang}-${slug}`,
        slug,
        lang,
        label: labelRow.keyword,
        postIds: [...bucket.postIds],
      });
    }
  }

  return entries;
}

export function keywordsLoader(): Loader {
  return {
    name: 'tonibover-keywords',
    async load({ store, logger, parseData, generateDigest }) {
      try {
        const entries = await fetchKeywordEntries();
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
            `[keywords] fetch failed, keeping cached entries: ${err instanceof Error ? err.message : String(err)}`
          );
          return;
        }
        throw err;
      }
    },
  };
}
