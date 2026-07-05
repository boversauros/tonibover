import { describe, it, expect } from 'vitest';
import { excerpt } from './excerpt';

describe('excerpt', () => {
  it('returns empty string for empty input', () => {
    expect(excerpt('')).toBe('');
  });

  it('strips HTML tags', () => {
    expect(excerpt('<p>foo <strong>bar</strong></p>')).toBe('foo bar');
  });

  it('collapses whitespace runs', () => {
    expect(excerpt('<p>foo</p>\n\n<p>  bar   baz</p>')).toBe('foo bar baz');
  });

  it('returns full text when shorter than maxLen', () => {
    const html = '<p>short text</p>';
    expect(excerpt(html, 200)).toBe('short text');
  });

  it('truncates at last word boundary with ellipsis', () => {
    const html = '<p>' + 'word '.repeat(60).trim() + '</p>';
    const out = excerpt(html, 50);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(51);
    expect(out).toMatch(/word…$/);
  });

  it('hard-slices single long word with no spaces', () => {
    const html = 'a'.repeat(300);
    const out = excerpt(html, 50);
    expect(out).toBe('a'.repeat(50) + '…');
  });

  it('respects custom maxLen', () => {
    const html = '<p>one two three four five six seven eight nine ten</p>';
    const out = excerpt(html, 15);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(16);
  });

  it('strips nested and self-closing tags', () => {
    expect(excerpt('<p>foo<br/>bar<img src="x"/>baz</p>')).toBe('foo bar baz');
  });
});
