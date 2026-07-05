import { describe, expect, it } from 'vitest';
import { validatePostRow } from './validate';
import type { RawJoinedPost, RawJoinedTranslation } from './types';

const tr = (
  language_id: number,
  overrides: Partial<RawJoinedTranslation> = {}
): RawJoinedTranslation => ({
  id: language_id * 10,
  language_id,
  title: 'T',
  slug: 's',
  content: '<p>c</p>',
  ...overrides,
});

const post = (overrides: Partial<RawJoinedPost> = {}): RawJoinedPost => ({
  id: 1,
  category_id: 1,
  is_published: true,
  date: '2026-01-01',
  sort_order: 0,
  category: { slug: 'vivencies' },
  post_translations: [tr(1)],
  thumbnail: null,
  image: null,
  ...overrides,
});

describe('validatePostRow', () => {
  it('passes when category and one usable translation exist', () => {
    expect(validatePostRow(post())).toEqual({ ok: true });
  });

  it('passes when both ca and en are usable', () => {
    expect(validatePostRow(post({ post_translations: [tr(1), tr(2)] }))).toEqual({ ok: true });
  });

  it('fails when category is null', () => {
    const result = validatePostRow(post({ category: null }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join('\n')).toMatch(/missing category FK/);
    }
  });

  it('fails when no translation exists', () => {
    const result = validatePostRow(post({ post_translations: [] }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join('\n')).toMatch(/no usable translation/);
    }
  });

  it('fails when all translations have empty title', () => {
    const result = validatePostRow(post({ post_translations: [tr(1, { title: '' })] }));
    expect(result.ok).toBe(false);
  });

  it('fails when all translations have empty slug', () => {
    expect(validatePostRow(post({ post_translations: [tr(1, { slug: '' })] })).ok).toBe(false);
  });

  it('fails when all translations have empty content', () => {
    expect(validatePostRow(post({ post_translations: [tr(1, { content: '' })] })).ok).toBe(false);
  });

  it('passes when at least one translation is usable even if another is empty', () => {
    expect(validatePostRow(post({ post_translations: [tr(1, { title: '' }), tr(2)] })).ok).toBe(
      true
    );
  });

  it('reports both errors when category AND translation are missing', () => {
    const result = validatePostRow(post({ category: null, post_translations: [] }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveLength(2);
    }
  });

  it('ignores translation rows with unknown language_id', () => {
    const result = validatePostRow(post({ post_translations: [tr(99)] }));
    expect(result.ok).toBe(false);
  });
});
