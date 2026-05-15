import { supabase } from '../supabase';
import { slugify } from '../slugify';

const CA_LANGUAGE_ID = 1;

interface KeywordEntry {
  id: string;
  slug: string;
  label: string;
  postIds: string[];
}

export function keywordsLoader() {
  return async (): Promise<KeywordEntry[]> => {
    const [pubPostsRes, kwRes] = await Promise.all([
      supabase.from('posts').select('id').eq('is_published', true),
      supabase.from('keywords').select('id, keyword').eq('language_id', CA_LANGUAGE_ID),
    ]);
    if (pubPostsRes.error) throw pubPostsRes.error;
    if (kwRes.error) throw kwRes.error;

    const pubPostIds = (pubPostsRes.data ?? []).map((p) => p.id as number);
    if (pubPostIds.length === 0) return [];

    const { data: trans, error: tErr } = await supabase
      .from('post_translations')
      .select('id, post_id')
      .eq('language_id', CA_LANGUAGE_ID)
      .in('post_id', pubPostIds);
    if (tErr) throw tErr;

    const transToPost = new Map<number, number>();
    for (const t of trans ?? []) {
      transToPost.set(t.id as number, t.post_id as number);
    }
    const transIds = [...transToPost.keys()];
    if (transIds.length === 0) return [];

    const { data: pk, error: pkErr } = await supabase
      .from('post_keywords')
      .select('keyword_id, post_translation_id')
      .in('post_translation_id', transIds);
    if (pkErr) throw pkErr;

    const kwToPosts = new Map<number, Set<string>>();
    for (const row of pk ?? []) {
      const r = row as { keyword_id: number; post_translation_id: number };
      const postId = transToPost.get(r.post_translation_id);
      if (postId === undefined) continue;
      const set = kwToPosts.get(r.keyword_id) ?? new Set<string>();
      set.add(String(postId));
      kwToPosts.set(r.keyword_id, set);
    }

    const kws = (kwRes.data ?? []) as Array<{ id: number; keyword: string }>;

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

    const entries: KeywordEntry[] = [];
    for (const [slug, bucket] of bySlug) {
      if (bucket.postIds.size === 0) continue;
      const smallestId = bucket.ids.reduce((a, b) => (a < b ? a : b));
      const labelRow = kws.find((k) => k.id === smallestId);
      if (!labelRow) continue;
      entries.push({
        id: slug,
        slug,
        label: labelRow.keyword,
        postIds: [...bucket.postIds],
      });
    }

    return entries;
  };
}
