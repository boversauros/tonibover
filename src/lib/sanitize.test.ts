import { describe, expect, it } from 'vitest';
import { sanitize } from './sanitize';

describe('sanitize', () => {
  describe('strips dangerous content', () => {
    it('removes <script> tags and contents', () => {
      const html = '<p>safe</p><script>alert(1)</script>';
      const out = sanitize(html);
      expect(out).not.toContain('<script>');
      expect(out).not.toContain('alert(1)');
      expect(out).toContain('<p>safe</p>');
    });

    it('removes <iframe>', () => {
      const out = sanitize('<p>x</p><iframe src="https://evil.example"></iframe>');
      expect(out).not.toContain('<iframe');
      expect(out).toContain('<p>x</p>');
    });

    it('strips on* event handlers', () => {
      const out = sanitize('<p onclick="alert(1)">click</p>');
      expect(out).not.toContain('onclick');
      expect(out).toContain('<p>click</p>');
    });

    it('strips javascript: URLs from href', () => {
      const out = sanitize('<a href="javascript:alert(1)">x</a>');
      expect(out).not.toContain('javascript:');
    });

    it('strips data: URLs from img src', () => {
      const out = sanitize('<img src="data:image/png;base64,AAAA" alt="x" />');
      expect(out).not.toContain('data:');
    });
  });

  describe('preserves allowed tags', () => {
    const allowed: Array<[string, string]> = [
      ['paragraph', '<p>hello</p>'],
      ['h1', '<h1>title</h1>'],
      ['h2', '<h2>title</h2>'],
      ['h3', '<h3>title</h3>'],
      ['strong', '<strong>bold</strong>'],
      ['em', '<em>italic</em>'],
      ['blockquote', '<blockquote>quote</blockquote>'],
      ['ul/li', '<ul><li>a</li></ul>'],
      ['ol/li', '<ol><li>a</li></ol>'],
      ['br', '<br />'],
      ['hr', '<hr />'],
    ];
    for (const [name, html] of allowed) {
      it(`keeps ${name}`, () => {
        expect(sanitize(html)).not.toBe('');
      });
    }

    it('keeps <a href="https://...">', () => {
      const out = sanitize('<a href="https://example.com">link</a>');
      expect(out).toContain('href="https://example.com"');
      expect(out).toContain('link');
    });

    it('keeps <a href="mailto:...">', () => {
      const out = sanitize('<a href="mailto:foo@example.com">mail</a>');
      expect(out).toContain('mailto:foo@example.com');
    });

    it('keeps <img src + alt + title>', () => {
      const out = sanitize('<img src="https://x.example/a.png" alt="a" title="t" />');
      expect(out).toContain('src="https://x.example/a.png"');
      expect(out).toContain('alt="a"');
      expect(out).toContain('title="t"');
    });
  });

  describe('strips non-allowlisted tags', () => {
    it('removes <table> and children', () => {
      const out = sanitize('<table><tr><td>x</td></tr></table>');
      expect(out).not.toContain('<table');
      expect(out).not.toContain('<tr');
      expect(out).not.toContain('<td');
    });

    it('removes <figure> and <figcaption>', () => {
      const out = sanitize(
        '<figure><img src="https://x.example/a.png" alt="a" /><figcaption>cap</figcaption></figure>'
      );
      expect(out).not.toContain('<figure');
      expect(out).not.toContain('<figcaption');
    });

    it('removes <span> and <div>', () => {
      const out = sanitize('<div><span>x</span></div>');
      expect(out).not.toContain('<span');
      expect(out).not.toContain('<div');
    });

    it('removes <style>', () => {
      const out = sanitize('<style>body{display:none}</style><p>ok</p>');
      expect(out).not.toContain('<style');
      expect(out).toContain('<p>ok</p>');
    });
  });
});
