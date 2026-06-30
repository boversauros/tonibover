import { describe, expect, it } from 'vitest';
import { emphasizeEscaped, escapeHtml, italicize, stripEmphasis } from './italicize';

describe('italicize', () => {
  it('wraps a single emphasis span in <em>', () => {
    expect(italicize('a *word* here')).toBe('a <em>word</em> here');
  });

  it('wraps multiple emphasis spans', () => {
    expect(italicize('*one* and *two*')).toBe('<em>one</em> and <em>two</em>');
  });

  it('leaves a lone asterisk as a literal', () => {
    expect(italicize('2 * 3 = 6')).toBe('2 * 3 = 6');
  });

  it('leaves an unbalanced asterisk as a literal', () => {
    expect(italicize('start *unclosed')).toBe('start *unclosed');
  });

  it('does not cross newlines', () => {
    expect(italicize('*a\nb*')).toBe('*a\nb*');
  });

  it('escapes HTML special chars before emphasizing', () => {
    expect(italicize('a & b < c > *d*')).toBe('a &amp; b &lt; c &gt; <em>d</em>');
  });

  it('escapes would-be tags inside emphasis', () => {
    expect(italicize('*<script>*')).toBe('<em>&lt;script&gt;</em>');
  });

  it('returns empty string for empty input', () => {
    expect(italicize('')).toBe('');
  });
});

describe('emphasizeEscaped', () => {
  it('only converts emphasis, assuming input is already escaped', () => {
    expect(emphasizeEscaped('a &amp; *b*')).toBe('a &amp; <em>b</em>');
  });
});

describe('escapeHtml', () => {
  it('escapes &, < and >', () => {
    expect(escapeHtml('a & b < c > d')).toBe('a &amp; b &lt; c &gt; d');
  });
});

describe('stripEmphasis', () => {
  it('removes the markers but keeps the text', () => {
    expect(stripEmphasis('a *word* here')).toBe('a word here');
  });

  it('leaves a lone asterisk untouched', () => {
    expect(stripEmphasis('2 * 3')).toBe('2 * 3');
  });
});
