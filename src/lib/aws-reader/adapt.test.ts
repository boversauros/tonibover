import { describe, expect, it } from 'vitest';
import { adaptSnapshot } from './adapt';
import { catalog, post } from './fixtures.test-support';

const snapshot = (posts = [post()]) => ({ revision: 1, catalog, posts });

describe('AWS to Astro adaptation', () => {
  it('retains category pages when there are no published posts', () => {
    const result = adaptSnapshot(snapshot([]));
    expect(result.posts).toEqual([]);
    expect(result.categories.map((item) => item.id)).toEqual(['vivencies']);
  });
  it('emits bilingual entries with category, keyword, HTML and reference compatibility', () => {
    const result = adaptSnapshot(snapshot());
    expect(result.posts.map((item) => item.id)).toEqual(['1-ca', '1-en']);
    expect(result.posts[0]).toMatchObject({
      category: 'vivencies',
      availableLangs: ['ca', 'en'],
      html: '<p>First</p><p>Second</p>',
      references: [{ type: 'text', reference: 'source', blockquote: 'quote', sort_order: 2 }],
    });
    expect(result.categories[0]).toMatchObject({ id: 'vivencies', name: { en: 'Experiences' } });
    expect(result.keywords.find((item) => item.id === 'ca-mon')).toMatchObject({
      label: 'Món',
      postIds: ['1-ca'],
    });
  });

  it('omits incomplete EN but retains CA and only its keyword routes', () => {
    const raw = post('64');
    raw.translations.en.slug = '';
    const result = adaptSnapshot(snapshot([raw]));
    expect(result.posts.map((item) => item.id)).toEqual(['64-ca']);
    expect(result.posts[0].availableLangs).toEqual(['ca']);
    expect(result.keywords.map((item) => item.lang)).toEqual(['ca']);
  });

  it('sorts by sort order then descending date', () => {
    const posts = [
      post('1', { sortOrder: 1 }),
      post('2', { date: '2026-01-01' }),
      post('3', { date: '2026-02-01' }),
    ];
    expect(
      adaptSnapshot(snapshot(posts))
        .posts.filter((item) => item.lang === 'ca')
        .map((item) => item.id)
    ).toEqual(['3-ca', '2-ca', '1-ca']);
  });

  it('uses the smallest numeric keyword ID as a collision label', () => {
    const raw = post();
    raw.translations.ca.keywords = [
      { id: '10', value: 'Mon' },
      { id: '2', value: 'Món' },
    ];
    const entry = adaptSnapshot(snapshot([raw])).keywords.find((item) => item.id === 'ca-mon');
    expect(entry).toMatchObject({ label: 'Món', postIds: ['1-ca'] });
  });

  it('preserves reference order and image fallbacks without exposing private URLs', () => {
    const raw = post();
    raw.translations.ca.references = [
      { id: 'late', type: 'image', reference: '/images/local.jpg', sortOrder: 5 },
      { id: 'early', type: 'text', reference: 'source', sortOrder: 1 },
    ];
    raw.mainImage = { title: 'Hero', alt: '', contentType: 'image/jpeg', sizeBytes: 123 };
    const result = adaptSnapshot(snapshot([raw]), () => '/content-images/hash.jpg');
    expect(result.posts[0].references.map((ref) => ref.sort_order)).toEqual([1, 5]);
    expect(result.posts[0].image).toEqual({ url: '/content-images/hash.jpg', alt: 'Hero' });
    expect(result.posts[0].thumbnail).toEqual(result.posts[0].image);
    expect(() => adaptSnapshot(snapshot([raw]))).toThrow(/materialization/);
  });

  it.each(['index', 'vivencies'])('rejects post slug %s that a listing route shadows', (slug) => {
    const raw = post();
    raw.translations.en.slug = slug;
    expect(() => adaptSnapshot(snapshot([raw]))).toThrow(/collides with a listing route/);
  });

  it('rejects a numeric slug only once that listing page exists', () => {
    // Legacy "-68" slugs were normalized to "68" during the AWS import.
    const numbered = post('68');
    numbered.translations.en.slug = '2';
    expect(adaptSnapshot(snapshot([numbered])).posts.map((item) => item.slug)).toContain('2');
    const fillers = Array.from({ length: 6 }, (_, index) => post(String(index + 100)));
    expect(() => adaptSnapshot(snapshot([numbered, ...fillers]))).toThrow(
      /Post 68-en slug "2" collides with a listing route/
    );
  });

  it.each(['a/b', 'Upper', ''])('rejects non-segment post slug %j', (slug) => {
    const raw = post();
    raw.translations.ca.slug = slug;
    raw.translations.en.slug = '';
    expect(() => adaptSnapshot(snapshot([raw]))).toThrow(/slug|usable/);
  });
});
