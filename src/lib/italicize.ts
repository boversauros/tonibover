export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Single-level emphasis: *text* -> <em>text</em>. No nesting, no newline crossing;
// a lone or unbalanced * is left as a literal asterisk.
const EMPHASIS_RE = /\*([^*\n]+)\*/g;

// Convert *...* emphasis on a string that is ALREADY HTML-escaped.
export function emphasizeEscaped(escaped: string): string {
  return escaped.replace(EMPHASIS_RE, '<em>$1</em>');
}

// Escape raw plain text, then convert *...* emphasis. Output is safe for set:html.
export function italicize(raw: string): string {
  return emphasizeEscaped(escapeHtml(raw));
}

// Remove the * markers, leaving plain readable text (e.g. for alt attributes).
export function stripEmphasis(raw: string): string {
  return raw.replace(EMPHASIS_RE, '$1');
}
