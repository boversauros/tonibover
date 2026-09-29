import { mkdtemp, readdir, readFile, rm, stat, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { adaptSnapshot } from './adapt';
import { imagePathFromManifest } from './image-manifest';
import { materializePublishedImages } from './materialize';
import { catalog, post } from './fixtures.test-support';
import type { ReaderTransport } from './client';

const dirs: string[] = [];
const grantUrl =
  'https://bucket.s3.eu-west-1.amazonaws.com/images/posts/1/main/object.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc';

afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'tonibover-media-'));
  dirs.push(root);
  const publicRoot = join(root, 'public');
  const manifestPath = join(root, 'private', 'manifest.json');
  const bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } })
    .jpeg()
    .toBuffer();
  const image = {
    title: 'Image title',
    alt: '',
    contentType: 'image/jpeg',
    sizeBytes: bytes.length,
  };
  const published = post('1', { mainImage: image, thumbImage: image });
  const snapshot = { revision: 7, catalog, posts: [published] };
  const reader: ReaderTransport = {
    invoke: vi.fn(async (request) => {
      if (request.operation === 'revision') return { revision: 7 };
      if (request.operation === 'media')
        return {
          url: grantUrl,
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          contentType: image.contentType,
          sizeBytes: image.sizeBytes,
        };
      throw new Error('Unexpected reader request');
    }),
  };
  const fetchImage = vi.fn(
    async () =>
      new Response(Uint8Array.from(bytes), {
        status: 200,
        headers: { 'content-type': 'image/jpeg', 'content-length': String(bytes.length) },
      })
  ) as unknown as typeof fetch;
  const options = { publicRoot, manifestPath, region: 'eu-west-1', fetchImage };
  return { root, publicRoot, manifestPath, bytes, snapshot, reader, fetchImage, options };
}

describe('published image materialization', () => {
  it('stores deduplicated bytes at durable local paths and preserves image fallback', async () => {
    const f = await fixture();
    await materializePublishedImages(f.snapshot, f.reader, 'dev', f.options);
    const files = await readdir(join(f.publicRoot, 'content-images'));
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^[a-f0-9]{64}\.jpg$/);
    expect(await readFile(join(f.publicRoot, 'content-images', files[0]))).toEqual(f.bytes);
    const manifest = JSON.parse(await readFile(f.manifestPath, 'utf8'));
    expect(manifest.images['1'].main).toBe(`/content-images/${files[0]}`);
    expect(manifest.images['1'].thumb).toBe(manifest.images['1'].main);
    expect(JSON.stringify(manifest)).not.toContain('X-Amz-');
    const entries = adaptSnapshot(
      f.snapshot,
      imagePathFromManifest(7, f.manifestPath, f.publicRoot)
    );
    expect(entries.posts[0].image).toEqual({ url: manifest.images['1'].main, alt: 'Image title' });
    expect(entries.posts[0].thumbnail).toEqual(entries.posts[0].image);
    expect(
      vi.mocked(f.reader.invoke).mock.calls.filter(([request]) => request.operation === 'media')
    ).toHaveLength(2);
  });

  it('keeps the prior image and manifest when a non-null slot is invalid', async () => {
    const f = await fixture();
    await materializePublishedImages(f.snapshot, f.reader, 'dev', f.options);
    const originalManifest = await readFile(f.manifestPath, 'utf8');
    const originalFiles = await readdir(join(f.publicRoot, 'content-images'));
    const badFetch = vi.fn(
      async () =>
        new Response('not an image', {
          status: 200,
          headers: {
            'content-type': 'image/jpeg',
            'content-length': String(f.bytes.length),
          },
        })
    ) as unknown as typeof fetch;
    await expect(
      materializePublishedImages(f.snapshot, f.reader, 'dev', {
        ...f.options,
        fetchImage: badFetch,
      })
    ).rejects.toThrow(/image/);
    expect(await readFile(f.manifestPath, 'utf8')).toBe(originalManifest);
    expect(await readdir(join(f.publicRoot, 'content-images'))).toEqual(originalFiles);
    expect((await stat(join(f.publicRoot, 'content-images', originalFiles[0]))).isFile()).toBe(
      true
    );
  });

  it('fails a missing attached object and keeps the previous asset set', async () => {
    const f = await fixture();
    await materializePublishedImages(f.snapshot, f.reader, 'dev', f.options);
    const originalManifest = await readFile(f.manifestPath, 'utf8');
    vi.mocked(f.reader.invoke).mockImplementation(async (request) => {
      if (request.operation === 'media') throw new Error('Build reader MEDIA_UNAVAILABLE');
      return { revision: 7 };
    });
    await expect(
      materializePublishedImages(f.snapshot, f.reader, 'dev', f.options)
    ).rejects.toThrow(/MEDIA_UNAVAILABLE/);
    expect(await readFile(f.manifestPath, 'utf8')).toBe(originalManifest);
    expect(await readdir(join(f.publicRoot, 'content-images'))).toHaveLength(1);
  });

  it('rejects truncated image bytes even when their header and length are valid', async () => {
    const f = await fixture();
    await materializePublishedImages(f.snapshot, f.reader, 'dev', f.options);
    const originalManifest = await readFile(f.manifestPath, 'utf8');
    const pixels = Buffer.from(Array.from({ length: 128 * 128 * 3 }, (_, i) => (i * 31) % 251));
    const complete = await sharp(pixels, { raw: { width: 128, height: 128, channels: 3 } })
      .jpeg()
      .toBuffer();
    const truncated = complete.subarray(0, complete.length - 20);
    await expect(sharp(truncated).metadata()).resolves.toMatchObject({ format: 'jpeg' });
    f.snapshot.posts[0].mainImage!.sizeBytes = truncated.length;
    const invalidFetch = vi.fn(
      async () =>
        new Response(Uint8Array.from(truncated), {
          headers: { 'content-type': 'image/jpeg', 'content-length': String(truncated.length) },
        })
    ) as unknown as typeof fetch;
    await expect(
      materializePublishedImages(f.snapshot, f.reader, 'dev', {
        ...f.options,
        fetchImage: invalidFetch,
      })
    ).rejects.toThrow(/bytes do not match/);
    expect(await readFile(f.manifestPath, 'utf8')).toBe(originalManifest);
  });

  it('keeps the prior assets when the site adapter rejects a snapshot', async () => {
    const f = await fixture();
    await materializePublishedImages(f.snapshot, f.reader, 'dev', f.options);
    const originalManifest = await readFile(f.manifestPath, 'utf8');
    const originalFiles = await readdir(join(f.publicRoot, 'content-images'));
    const invalid = post('2');
    invalid.translations.ca.title = '';
    invalid.translations.en.title = '';
    await expect(
      materializePublishedImages({ ...f.snapshot, posts: [invalid] }, f.reader, 'dev', f.options)
    ).rejects.toThrow(/no usable translation/);
    expect(await readFile(f.manifestPath, 'utf8')).toBe(originalManifest);
    expect(await readdir(join(f.publicRoot, 'content-images'))).toEqual(originalFiles);
  });

  it('rejects unsafe hosts without requesting them', async () => {
    const f = await fixture();
    vi.mocked(f.reader.invoke).mockImplementation(async (request) =>
      request.operation === 'media'
        ? {
            url: grantUrl.replace('bucket.s3.eu-west-1.amazonaws.com', 'attacker.example'),
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            contentType: 'image/jpeg',
            sizeBytes: f.bytes.length,
          }
        : { revision: 7 }
    );
    await expect(
      materializePublishedImages(f.snapshot, f.reader, 'dev', f.options)
    ).rejects.toThrow('Invalid image grant URL');
    expect(f.fetchImage).not.toHaveBeenCalled();
  });

  it('rejects a signed URL redirect and preserves the existing assets', async () => {
    const f = await fixture();
    await materializePublishedImages(f.snapshot, f.reader, 'dev', f.options);
    const originalManifest = await readFile(f.manifestPath, 'utf8');
    const redirected = vi.fn(
      async () =>
        new Response(null, { status: 302, headers: { location: 'https://attacker.example/image' } })
    ) as unknown as typeof fetch;
    await expect(
      materializePublishedImages(f.snapshot, f.reader, 'dev', {
        ...f.options,
        fetchImage: redirected,
      })
    ).rejects.toThrow(/response metadata mismatch/);
    expect(await readFile(f.manifestPath, 'utf8')).toBe(originalManifest);
    expect(vi.mocked(redirected).mock.calls[0][1]).toMatchObject({ redirect: 'manual' });
  });

  it('prunes unreferenced files after a successful unpublish rebuild', async () => {
    const f = await fixture();
    await materializePublishedImages(f.snapshot, f.reader, 'dev', f.options);
    await materializePublishedImages({ ...f.snapshot, posts: [] }, f.reader, 'dev', f.options);
    expect(await readdir(join(f.publicRoot, 'content-images'))).toEqual([]);
    expect(JSON.parse(await readFile(f.manifestPath, 'utf8')).images).toEqual({});
  });

  it('preserves assets when the published revision changes during download', async () => {
    const f = await fixture();
    await mkdir(join(f.publicRoot, 'content-images'), { recursive: true });
    await writeFile(join(f.publicRoot, 'content-images', 'old.jpg'), f.bytes);
    vi.mocked(f.reader.invoke).mockImplementation(async (request) =>
      request.operation === 'media'
        ? {
            url: grantUrl,
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            contentType: 'image/jpeg',
            sizeBytes: f.bytes.length,
          }
        : { revision: 8 }
    );
    await expect(
      materializePublishedImages(f.snapshot, f.reader, 'dev', f.options)
    ).rejects.toThrow(/revision changed/);
    expect(await readdir(join(f.publicRoot, 'content-images'))).toEqual(['old.jpg']);
  });
});
