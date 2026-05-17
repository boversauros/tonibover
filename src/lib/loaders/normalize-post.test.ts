import { describe, expect, it, vi } from 'vitest';
import { normalizePosts } from './normalize-post';
import type { RawJoinedImage, RawJoinedPost, RawJoinedTranslation } from './types';

const PLACEHOLDER_URL = '/images/inici_img.webp';

const tr = (
  language_id: number,
  overrides: Partial<RawJoinedTranslation> = {}
): RawJoinedTranslation => ({
  id: language_id * 10,
  language_id,
  title: `Title-${language_id}`,
  slug: `slug-${language_id}`,
  content: `<p>content-${language_id}</p>`,
  ...overrides,
});

const img = (overrides: Partial<RawJoinedImage> = {}): RawJoinedImage => ({
  id: 1,
  url: 'https://x.example/img.png',
  title: null,
  alt: null,
  ...overrides,
});

const post = (overrides: Partial<RawJoinedPost> = {}): RawJoinedPost => ({
  id: 1,
  category_id: 1,
  is_published: true,
  date: '2026-01-01',
  sort_order: 0,
  category: { slug: 'vivencies' },
  post_translations: [tr(1)],
  thumbnail: null,
  image: null,
  ...overrides,
});

const identity = (s: string) => s;
const emptyMaps = () => ({ kwMap: new Map<number, string[]>(), refMap: new Map() });

describe('normalizePosts', () => {
  it('CA-only emits one entry', () => {
    const out = normalizePosts({
      rows: [post()],
      ...emptyMaps(),
      sanitize: identity,
    });
    expect(out).toHaveLength(1);
    expect(out[0].lang).toBe('ca');
    expect(out[0].availableLangs).toEqual(['ca']);
  });

  it('CA+EN emits two entries with shared availableLangs', () => {
    const out = normalizePosts({
      rows: [post({ post_translations: [tr(1), tr(2)] })],
      ...emptyMaps(),
      sanitize: identity,
    });
    expect(out).toHaveLength(2);
    expect(out.map((e) => e.lang).sort()).toEqual(['ca', 'en']);
    for (const e of out) expect(e.availableLangs).toEqual(['ca', 'en']);
  });

  it('empty EN translation row emits only CA', () => {
    const out = normalizePosts({
      rows: [
        post({
          post_translations: [tr(1), tr(2, { title: '', slug: '', content: '' })],
        }),
      ],
      ...emptyMaps(),
      sanitize: identity,
    });
    expect(out).toHaveLength(1);
    expect(out[0].lang).toBe('ca');
    expect(out[0].availableLangs).toEqual(['ca']);
  });

  it('alt falls back to title when image.alt is null', () => {
    const out = normalizePosts({
      rows: [
        post({
          image: img({ alt: null, title: null }),
          thumbnail: img({ alt: null, title: null }),
        }),
      ],
      ...emptyMaps(),
      sanitize: identity,
    });
    expect(out[0].image!.alt).toBe('Title-1');
    expect(out[0].thumbnail.alt).toBe('Title-1');
  });

  it('alt prefers image.alt over image.title over post title', () => {
    const out = normalizePosts({
      rows: [
        post({
          image: img({ alt: 'image-alt', title: 'image-title' }),
        }),
      ],
      ...emptyMaps(),
      sanitize: identity,
    });
    expect(out[0].image!.alt).toBe('image-alt');
  });

  it('thumbnail falls back to image when thumbnail is null', () => {
    const heroOnly = img({ url: 'https://x.example/hero.png' });
    const out = normalizePosts({
      rows: [post({ image: heroOnly, thumbnail: null })],
      ...emptyMaps(),
      sanitize: identity,
    });
    expect(out[0].thumbnail.url).toBe('https://x.example/hero.png');
  });

  it('missing image AND thumbnail: hero omitted, thumbnail uses placeholder', () => {
    const out = normalizePosts({
      rows: [post({ image: null, thumbnail: null })],
      ...emptyMaps(),
      sanitize: identity,
    });
    expect(out[0].image).toBeUndefined();
    expect(out[0].thumbnail.url).toBe(PLACEHOLDER_URL);
  });

  it('orders by sort_order ASC, then date DESC', () => {
    const out = normalizePosts({
      rows: [
        { ...post({ id: 1, sort_order: 1, date: '2026-01-01' }) },
        { ...post({ id: 2, sort_order: 0, date: '2026-03-01' }) },
        { ...post({ id: 3, sort_order: 0, date: '2026-05-01' }) },
      ],
      ...emptyMaps(),
      sanitize: identity,
    });
    expect(out.map((e) => e.id)).toEqual(['3-ca', '2-ca', '1-ca']);
  });

  it('calls sanitize on translation content', () => {
    const spy = vi.fn((s: string) => `SANITIZED:${s}`);
    const out = normalizePosts({
      rows: [post()],
      ...emptyMaps(),
      sanitize: spy,
    });
    expect(spy).toHaveBeenCalledWith('<p>content-1</p>');
    expect(out[0].html).toBe('SANITIZED:<p>content-1</p>');
  });

  it('attaches keywords and references from injected maps', () => {
    const refMap = new Map([
      [
        10,
        [{ type: 'text' as const, reference: 'r', blockquote: null, sort_order: 0 }],
      ],
    ]);
    const kwMap = new Map([[10, ['kw1', 'kw2']]]);
    const out = normalizePosts({
      rows: [post()],
      kwMap,
      refMap,
      sanitize: identity,
    });
    expect(out[0].keywords).toEqual(['kw1', 'kw2']);
    expect(out[0].references).toHaveLength(1);
  });

  it('throws aggregated error when any row fails validation', () => {
    expect(() =>
      normalizePosts({
        rows: [post({ id: 5, category: null })],
        ...emptyMaps(),
        sanitize: identity,
      })
    ).toThrow(/Post 5: missing category FK/);
  });

  it('aggregates errors across multiple bad rows', () => {
    try {
      normalizePosts({
        rows: [
          post({ id: 1, category: null }),
          post({ id: 2, post_translations: [] }),
        ],
        ...emptyMaps(),
        sanitize: identity,
      });
      throw new Error('should have thrown');
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toMatch(/Post 1/);
      expect(msg).toMatch(/Post 2/);
      expect(msg).toMatch(/2 errors/);
    }
  });
});
