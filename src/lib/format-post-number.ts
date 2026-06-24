/** Format a post id for display: 005, 010, 100, … */
export function formatPostNumber(n: number): string {
  if (n >= 100) return String(n);
  return String(n).padStart(3, '0');
}

/** Extract the numeric Supabase post id from a content entry id (`{postId}-{lang}`). */
export function postIdFromEntryId(entryId: string): number {
  const [raw] = entryId.split('-');
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) {
    throw new Error(`Invalid post entry id: ${entryId}`);
  }
  return n;
}
