import { describe, expect, it, vi } from 'vitest';
import { fetchPublishedSnapshot } from './snapshot';
import type { ReaderTransport } from './client';
import { catalog, post } from './fixtures.test-support';
import { ReaderFailure } from './client';

function readerFor(
  ids: string[],
  options: {
    page?: (cursor?: string) => unknown;
    detail?: (id: string) => unknown;
    revision?: () => number;
    catalog?: unknown;
  } = {}
): ReaderTransport {
  return {
    invoke: vi.fn(async (request) => {
      switch (request.operation) {
        case 'revision':
          return { revision: options.revision?.() ?? 1 };
        case 'catalog':
          return options.catalog ?? catalog;
        case 'posts':
          return (
            options.page?.(request.cursor) ?? {
              items: ids.map((id) => ({ id, version: 1 })),
              nextCursor: null,
            }
          );
        case 'post':
          return options.detail ? options.detail(request.id) : post(request.id);
      }
    }),
  };
}

describe('published snapshot', () => {
  it('accepts a genuinely empty published set with a valid revision and catalog', async () => {
    const snapshot = await fetchPublishedSnapshot(readerFor([]), 'dev');
    expect(snapshot.posts).toEqual([]);
    expect(snapshot.catalog.categories).toHaveLength(1);
  });

  it('fetches every page and full detail beyond 50 posts', async () => {
    const ids = Array.from({ length: 51 }, (_, i) => String(i + 1));
    const reader = readerFor(ids, {
      page: (cursor) =>
        cursor
          ? { items: [{ id: ids[50], version: 1 }], nextCursor: null }
          : { items: ids.slice(0, 50).map((id) => ({ id, version: 1 })), nextCursor: 'next' },
    });
    const snapshot = await fetchPublishedSnapshot(reader, 'dev');
    expect(snapshot.posts).toHaveLength(51);
    expect(
      vi.mocked(reader.invoke).mock.calls.filter(([request]) => request.operation === 'post')
    ).toHaveLength(51);
  });

  const failureCases: Array<[string, Parameters<typeof readerFor>[1], RegExp]> = [
    [
      'repeated cursor',
      { page: () => ({ items: [{ id: '1', version: 1 }], nextCursor: 'repeat' }) },
      /cursor/,
    ],
    ['missing detail', { detail: () => null }, /Malformed.*post detail/],
    ['wrong version', { detail: () => post('1', { version: 2 }) }, /version mismatch/],
    ['draft detail', { detail: () => ({ ...post(), published: false }) }, /Malformed.*post detail/],
    ['bad catalog', { catalog: { categories: [], keywords: [] } }, /category catalog link/],
    ['missing keyword', { catalog: { ...catalog, keywords: [] } }, /keyword catalog link/],
    [
      'private URL',
      {
        detail: () =>
          post('1', {
            translations: {
              ...post().translations,
              ca: {
                ...post().translations.ca,
                content: '<img src="https://bucket.s3.amazonaws.com/a">',
              },
            },
          }),
      },
      /Private URL/,
    ],
  ];
  it.each(failureCases)('fails on %s', async (_label, options, pattern) => {
    await expect(fetchPublishedSnapshot(readerFor(['1'], options), 'dev')).rejects.toThrow(pattern);
  });

  it('rejects duplicate IDs across pages', async () => {
    const reader = readerFor(['1'], {
      page: (cursor) =>
        cursor
          ? { items: [{ id: '1', version: 1 }], nextCursor: null }
          : { items: [{ id: '1', version: 1 }], nextCursor: 'next' },
    });
    await expect(fetchPublishedSnapshot(reader, 'dev')).rejects.toThrow(
      /Duplicate published post ID/
    );
  });

  it('retries a changed revision as a whole snapshot and then succeeds', async () => {
    const revisions = [1, 2, 2, 2];
    const reader = readerFor(['1'], { revision: () => revisions.shift()! });
    await expect(fetchPublishedSnapshot(reader, 'dev')).resolves.toMatchObject({ revision: 2 });
    expect(
      vi.mocked(reader.invoke).mock.calls.filter(([request]) => request.operation === 'catalog')
    ).toHaveLength(2);
  });

  it('restarts the whole snapshot on a detail version conflict', async () => {
    let first = true;
    const reader = readerFor(['1'], {
      detail: (id) => {
        if (first) {
          first = false;
          throw new ReaderFailure('VERSION_CONFLICT', false, true);
        }
        return post(id);
      },
    });
    await expect(fetchPublishedSnapshot(reader, 'dev')).resolves.toMatchObject({ revision: 1 });
    expect(
      vi.mocked(reader.invoke).mock.calls.filter(([request]) => request.operation === 'catalog')
    ).toHaveLength(2);
  });

  it('fails after repeated revision drift', async () => {
    let count = 0;
    const reader = readerFor(['1'], { revision: () => ++count });
    await expect(fetchPublishedSnapshot(reader, 'dev')).rejects.toThrow(/revision changed/);
  });
});
