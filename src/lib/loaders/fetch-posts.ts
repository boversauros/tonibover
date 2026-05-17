import { supabase } from '../supabase';
import type { RawJoinedPost, RawPostKeywordRow, RawPostReferenceRow } from './types';

export interface RawFetchResult {
  rows: RawJoinedPost[];
  kwRows: RawPostKeywordRow[];
  refRows: RawPostReferenceRow[];
}

export async function fetchPosts(): Promise<RawFetchResult> {
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

  const rows = (posts ?? []) as unknown as RawJoinedPost[];

  const allTranslationIds = rows.flatMap((p) =>
    (p.post_translations ?? []).map((t) => t.id)
  );

  if (allTranslationIds.length === 0) {
    return { rows, kwRows: [], refRows: [] };
  }

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

  return {
    rows,
    kwRows: (kwResult.data ?? []) as unknown as RawPostKeywordRow[],
    refRows: (refResult.data ?? []) as unknown as RawPostReferenceRow[],
  };
}
