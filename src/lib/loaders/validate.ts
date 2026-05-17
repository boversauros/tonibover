import { LANG_BY_ID, type RawJoinedPost, type RawJoinedTranslation } from './types';

export type ValidationResult = { ok: true } | { ok: false; errors: string[] };

function isUsable(t: RawJoinedTranslation): boolean {
  return !!t.title && !!t.slug && !!t.content;
}

export function validatePostRow(row: RawJoinedPost): ValidationResult {
  const errors: string[] = [];

  if (!row.category?.slug) {
    errors.push(`Post ${row.id}: missing category FK (category.slug is null)`);
  }

  const usable = (row.post_translations ?? []).filter(
    (t) => LANG_BY_ID[t.language_id] !== undefined && isUsable(t)
  );
  if (usable.length === 0) {
    errors.push(
      `Post ${row.id}: no usable translation (need non-empty title/slug/content in at least one of ca/en)`
    );
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
