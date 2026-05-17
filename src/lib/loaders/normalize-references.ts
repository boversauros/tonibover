import type { RawPostReferenceRow, Reference, ReferenceType } from './types';

const VALID_TYPES: readonly ReferenceType[] = ['text', 'image', 'blockquote'];

function asReferenceType(value: string): ReferenceType {
  return (VALID_TYPES as readonly string[]).includes(value)
    ? (value as ReferenceType)
    : 'text';
}

export function groupReferencesByTranslation(
  rows: RawPostReferenceRow[]
): Map<number, Reference[]> {
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);
  const map = new Map<number, Reference[]>();
  for (const r of sorted) {
    const arr = map.get(r.post_translation_id) ?? [];
    arr.push({
      type: asReferenceType(r.type),
      reference: r.reference,
      blockquote: r.blockquote,
      sort_order: r.sort_order,
    });
    map.set(r.post_translation_id, arr);
  }
  return map;
}
