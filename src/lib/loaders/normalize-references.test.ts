import { describe, expect, it } from 'vitest';
import { groupReferencesByTranslation } from './normalize-references';
import type { RawPostReferenceRow } from './types';

const ref = (
  post_translation_id: number,
  sort_order: number,
  overrides: Partial<RawPostReferenceRow> = {}
): RawPostReferenceRow => ({
  post_translation_id,
  type: 'text',
  reference: `ref-${post_translation_id}-${sort_order}`,
  blockquote: null,
  sort_order,
  ...overrides,
});

describe('groupReferencesByTranslation', () => {
  it('returns empty map for empty input', () => {
    expect(groupReferencesByTranslation([])).toEqual(new Map());
  });

  it('groups references by translation id', () => {
    const rows = [ref(1, 0), ref(2, 0), ref(1, 1)];
    const map = groupReferencesByTranslation(rows);
    expect(map.get(1)).toHaveLength(2);
    expect(map.get(2)).toHaveLength(1);
  });

  it('preserves sort_order within a translation', () => {
    const rows = [ref(1, 5), ref(1, 1), ref(1, 3)];
    const map = groupReferencesByTranslation(rows);
    const orders = map.get(1)!.map((r) => r.sort_order);
    expect(orders).toEqual([1, 3, 5]);
  });

  it('sorts defensively even if input is unsorted', () => {
    const rows = [ref(7, 99), ref(7, 0), ref(7, 50)];
    const map = groupReferencesByTranslation(rows);
    expect(map.get(7)!.map((r) => r.sort_order)).toEqual([0, 50, 99]);
  });

  it('passes through type, reference, blockquote', () => {
    const rows = [
      ref(1, 0, { type: 'blockquote', reference: 'src', blockquote: 'quoted text' }),
    ];
    const out = groupReferencesByTranslation(rows).get(1)!;
    expect(out[0]).toMatchObject({
      type: 'blockquote',
      reference: 'src',
      blockquote: 'quoted text',
    });
  });

  it('coerces unknown type to text', () => {
    const rows = [ref(1, 0, { type: 'bogus' })];
    const out = groupReferencesByTranslation(rows).get(1)!;
    expect(out[0].type).toBe('text');
  });
});
