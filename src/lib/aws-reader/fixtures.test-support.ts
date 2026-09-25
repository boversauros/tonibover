import type { Catalog, PublishedPost } from './contract';

export const catalog: Catalog = {
  categories: [{ id: '1', slug: 'vivencies', names: { ca: 'Vivències', en: 'Experiences' } }],
  keywords: [
    { id: '2', language: 'ca', value: 'Món' },
    { id: '10', language: 'ca', value: 'Mon' },
    { id: 'abc', language: 'en', value: 'World' },
  ],
};

export function post(id = '1', overrides: Partial<PublishedPost> = {}): PublishedPost {
  return {
    id,
    version: 1,
    published: true,
    category: { id: '1', slug: 'vivencies' },
    sortOrder: 0,
    date: '2026-01-01',
    translations: {
      ca: {
        id: `${id}-ca`,
        title: `Títol ${id}`,
        slug: `titol-${id}`,
        content: 'First\n\nSecond',
        translationStatus: 'complete',
        keywords: [{ id: '2', value: 'Món' }],
        references: [
          { id: `${id}-ref`, type: 'text', reference: 'source', blockquote: 'quote', sortOrder: 2 },
        ],
      },
      en: {
        id: `${id}-en`,
        title: `Title ${id}`,
        slug: `title-${id}`,
        content: '<p>English</p>',
        translationStatus: 'complete',
        keywords: [{ id: 'abc', value: 'World' }],
        references: [],
      },
    },
    mainImage: null,
    thumbImage: null,
    ...overrides,
  };
}
