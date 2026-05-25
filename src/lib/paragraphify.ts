const BLOCK_TAG_RE = /<(p|h[1-6]|ul|ol|li|blockquote|hr|br)\b/i;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function paragraphify(input: string): string {
  if (!input) return '';
  if (BLOCK_TAG_RE.test(input)) return input;

  const normalized = input.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return '';

  return normalized
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => `<p>${escapeHtml(chunk).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}
