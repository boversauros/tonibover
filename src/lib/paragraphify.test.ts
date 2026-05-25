import { describe, expect, it } from 'vitest';
import { paragraphify } from './paragraphify';

describe('paragraphify', () => {
  it('returns empty string for empty input', () => {
    expect(paragraphify('')).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(paragraphify('   \n\n  ')).toBe('');
  });

  it('wraps a single chunk in <p>', () => {
    expect(paragraphify('hello world')).toBe('<p>hello world</p>');
  });

  it('splits on blank lines into multiple <p>', () => {
    expect(paragraphify('one\n\ntwo')).toBe('<p>one</p><p>two</p>');
  });

  it('treats 3+ blank lines as a single split', () => {
    expect(paragraphify('one\n\n\n\ntwo')).toBe('<p>one</p><p>two</p>');
  });

  it('converts single newline within paragraph to <br/>', () => {
    expect(paragraphify('line a\nline b')).toBe('<p>line a<br/>line b</p>');
  });

  it('handles CRLF and CR line endings', () => {
    expect(paragraphify('a\r\n\r\nb')).toBe('<p>a</p><p>b</p>');
    expect(paragraphify('a\r\rb')).toBe('<p>a</p><p>b</p>');
  });

  it('escapes HTML special chars in plain text', () => {
    expect(paragraphify('a & b < c > d')).toBe('<p>a &amp; b &lt; c &gt; d</p>');
  });

  it('escapes would-be tags so sanitize never sees them as markup', () => {
    expect(paragraphify('<script>alert(1)</script>')).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>'
    );
  });

  it('passes through content that already contains <p>', () => {
    const html = '<p>existing</p><p>html</p>';
    expect(paragraphify(html)).toBe(html);
  });

  it('passes through content with other block tags (h2, ul, blockquote)', () => {
    expect(paragraphify('<h2>title</h2>plain')).toBe('<h2>title</h2>plain');
    expect(paragraphify('<ul><li>a</li></ul>')).toBe('<ul><li>a</li></ul>');
    expect(paragraphify('<blockquote>q</blockquote>')).toBe('<blockquote>q</blockquote>');
  });

  it('trims leading/trailing whitespace around the document', () => {
    expect(paragraphify('\n\n  hello  \n\n')).toBe('<p>hello</p>');
  });

  it('drops empty chunks between blank lines', () => {
    expect(paragraphify('a\n\n   \n\nb')).toBe('<p>a</p><p>b</p>');
  });
});
