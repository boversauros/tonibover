import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPublishedSnapshot } from '../aws-reader/snapshot';
import { adaptSnapshot } from '../aws-reader/adapt';
import { siteCollectionLoader } from './site-collections';

vi.mock('../aws-reader/snapshot', () => ({ getPublishedSnapshot: vi.fn() }));
vi.mock('../aws-reader/adapt', () => ({ adaptSnapshot: vi.fn() }));
vi.mock('../aws-reader/image-manifest', () => ({ imagePathFromManifest: vi.fn() }));

afterEach(() => vi.clearAllMocks());

describe('Astro collection refresh', () => {
  it('keeps the last good dev entries when the next snapshot fails', async () => {
    vi.stubEnv('DEV', true);
    vi.mocked(getPublishedSnapshot)
      .mockResolvedValueOnce({ revision: 1 } as never)
      .mockRejectedValueOnce(new Error('reader unavailable'));
    vi.mocked(adaptSnapshot).mockReturnValue({
      posts: [{ id: '1-ca', title: 'First' }],
      categories: [],
      keywords: [],
    } as never);
    const entries = new Map<string, unknown>();
    const store = {
      clear: vi.fn(() => entries.clear()),
      set: vi.fn(({ id, data }: { id: string; data: unknown }) => entries.set(id, data)),
    };
    const logger = { warn: vi.fn() };
    const loader = siteCollectionLoader('posts');
    if (typeof loader === 'function') throw new Error('Expected object loader');
    const context = {
      store,
      logger,
      parseData: vi.fn(async ({ data }: { data: unknown }) => data),
      generateDigest: vi.fn(() => 'digest'),
    } as never;
    await loader.load(context);
    expect(entries.get('1-ca')).toMatchObject({ title: 'First' });
    await loader.load(context);
    expect(entries.get('1-ca')).toMatchObject({ title: 'First' });
    expect(store.clear).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledOnce();
    vi.unstubAllEnvs();
  });
});
