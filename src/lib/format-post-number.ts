/** Format a post id for display: 005, 010, 100, … */
export function formatPostNumber(n: number): string {
  if (n >= 100) return String(n);
  return String(n).padStart(3, '0');
}
