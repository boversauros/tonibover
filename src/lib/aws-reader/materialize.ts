import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import sharp from 'sharp';
import { z } from 'zod';
import { adaptSnapshot } from './adapt';
import { ReaderFailure, type ReaderTransport } from './client';
import { revisionSchema, type Environment, type PublishedPost } from './contract';
import { fetchPublishedSnapshot, type PublishedSnapshot } from './snapshot';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const imageTypes = {
  'image/jpeg': { extension: 'jpg', format: 'jpeg' },
  'image/png': { extension: 'png', format: 'png' },
  'image/webp': { extension: 'webp', format: 'webp' },
  'image/avif': { extension: 'avif', format: 'heif' },
} as const;

const grantSchema = z
  .object({
    url: z.string().url(),
    expiresAt: z.string().datetime({ offset: true }),
    contentType: z.string(),
    sizeBytes: z.number().int().positive().max(MAX_IMAGE_BYTES),
  })
  .strict();

export const defaultImageManifest = resolve(
  process.cwd(),
  'node_modules/.cache/tonibover/image-manifest.json'
);

type ImageManifest = {
  revision: number;
  images: Record<string, { version: number; main?: string; thumb?: string }>;
};

type Options = {
  publicRoot?: string;
  manifestPath?: string;
  region?: string;
  fetchImage?: typeof fetch;
};

function safeGrantUrl(raw: string, region: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Invalid image grant URL');
  }
  const host = url.hostname.toLowerCase();
  const regionalHost = `s3.${region}.amazonaws.com`;
  const permitted = host === regionalHost || host.endsWith(`.${regionalHost}`);
  if (
    url.protocol !== 'https:' ||
    !permitted ||
    url.port ||
    url.username ||
    url.password ||
    url.hash ||
    url.searchParams.get('X-Amz-Algorithm') !== 'AWS4-HMAC-SHA256' ||
    !url.searchParams.has('X-Amz-Signature')
  ) {
    throw new Error('Invalid image grant URL');
  }
  return url;
}

async function downloadImage(
  rawUrl: string,
  contentType: keyof typeof imageTypes,
  sizeBytes: number,
  region: string,
  fetchImage: typeof fetch
): Promise<Buffer> {
  const url = safeGrantUrl(rawUrl, region);
  let response: Response;
  try {
    response = await fetchImage(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error('Published image download failed');
  }
  if (
    response.status !== 200 ||
    response.headers.get('content-type')?.toLowerCase() !== contentType ||
    response.headers.get('content-length') !== String(sizeBytes) ||
    !response.body
  ) {
    await response.body?.cancel();
    throw new Error('Published image response metadata mismatch');
  }
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for await (const chunk of response.body) {
      length += chunk.byteLength;
      if (length > sizeBytes || length > MAX_IMAGE_BYTES) {
        await response.body.cancel();
        throw new Error('Published image size mismatch');
      }
      chunks.push(chunk);
    }
  } catch {
    throw new Error('Published image download failed');
  }
  if (length !== sizeBytes) throw new Error('Published image size mismatch');
  const bytes = Buffer.concat(chunks, length);
  try {
    const image = sharp(bytes, { limitInputPixels: 100_000_000, failOn: 'warning' });
    const metadata = await image.metadata();
    if (
      metadata.format !== imageTypes[contentType].format ||
      (contentType === 'image/avif' && metadata.compression !== 'av1') ||
      !metadata.width ||
      !metadata.height
    ) {
      throw new Error();
    }
    // Metadata can accept truncated files; stats forces a complete decode.
    await image.stats();
  } catch {
    throw new Error('Published image bytes do not match the declared type');
  }
  return bytes;
}

async function atomicManifest(path: string, manifest: ImageManifest): Promise<void> {
  await mkdir(resolve(path, '..'), { recursive: true });
  const temp = `${path}.${process.pid}.tmp`;
  try {
    await writeFile(temp, JSON.stringify(manifest), { mode: 0o600 });
    await rename(temp, path);
  } finally {
    await rm(temp, { force: true });
  }
}

/** Stage every attached image before replacing the current generated assets. */
export async function materializePublishedImages(
  snapshot: PublishedSnapshot,
  reader: ReaderTransport,
  environment: Environment,
  options: Options = {}
): Promise<string> {
  const publicRoot = resolve(options.publicRoot ?? resolve(process.cwd(), 'public'));
  const manifestPath = resolve(options.manifestPath || defaultImageManifest);
  if (manifestPath === publicRoot || manifestPath.startsWith(`${publicRoot}${sep}`)) {
    throw new Error('Generated image manifest must remain private');
  }
  const region = options.region ?? process.env.AWS_READER_REGION;
  if (!region || !/^[a-z]{2}-[a-z]+-\d$/.test(region)) {
    throw new Error('Invalid image grant region');
  }
  const fetchImage = options.fetchImage ?? fetch;
  await mkdir(publicRoot, { recursive: true });
  const stagingRoot = resolve(publicRoot, '..', 'node_modules/.cache/tonibover');
  await mkdir(stagingRoot, { recursive: true });
  const stage = await mkdtemp(join(stagingRoot, 'content-images-stage-'));
  const target = join(publicRoot, 'content-images');
  const backup = `${stage}-previous`;
  const manifest: ImageManifest = { revision: snapshot.revision, images: Object.create(null) };
  let movedOld = false;
  let movedNew = false;
  try {
    const tasks: Array<{ post: PublishedPost; role: 'main' | 'thumb' }> = [];
    for (const post of snapshot.posts) {
      manifest.images[post.id] = { version: post.version };
      for (const role of ['main', 'thumb'] as const) {
        if (role === 'main' ? post.mainImage : post.thumbImage) tasks.push({ post, role });
      }
    }
    // Keep concurrent grants short-lived and keep memory bounded to four images.
    for (let index = 0; index < tasks.length; index += 4) {
      const results = await Promise.allSettled(
        tasks.slice(index, index + 4).map(async ({ post, role }) => {
          const image = role === 'main' ? post.mainImage! : post.thumbImage!;
          const type = imageTypes[image.contentType as keyof typeof imageTypes];
          if (!type || image.sizeBytes < 1 || image.sizeBytes > MAX_IMAGE_BYTES) {
            throw new Error('Invalid published image metadata');
          }
          const grant = grantSchema.safeParse(
            await reader.invoke({
              version: 1,
              environment,
              operation: 'media',
              postId: post.id,
              role,
              expectedVersion: post.version,
            })
          );
          if (
            !grant.success ||
            grant.data.contentType !== image.contentType ||
            grant.data.sizeBytes !== image.sizeBytes ||
            Date.parse(grant.data.expiresAt) <= Date.now()
          ) {
            throw new Error('Published image grant mismatch');
          }
          const bytes = await downloadImage(
            grant.data.url,
            image.contentType as keyof typeof imageTypes,
            image.sizeBytes,
            region,
            fetchImage
          );
          const hash = createHash('sha256').update(bytes).digest('hex');
          const filename = `${hash}.${type.extension}`;
          try {
            await writeFile(join(stage, filename), bytes, { flag: 'wx' });
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
          }
          manifest.images[post.id][role] = `/content-images/${filename}`;
        })
      );
      const failure = results.find((result) => result.status === 'rejected');
      if (failure?.status === 'rejected') throw failure.reason;
    }
    // Validate the same site-facing adaptation before touching the last good assets.
    adaptSnapshot(snapshot, (post, role) => {
      const path = manifest.images[post.id]?.[role];
      if (!path) throw new Error('Missing materialized published image');
      return path;
    });
    const revision = revisionSchema.safeParse(
      await reader.invoke({ version: 1, environment, operation: 'revision' })
    );
    if (!revision.success || revision.data.revision !== snapshot.revision) {
      throw new ReaderFailure('Published revision changed during image fetch', false, true);
    }
    try {
      await rename(target, backup);
      movedOld = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    await rename(stage, target);
    movedNew = true;
    await atomicManifest(manifestPath, manifest);
    await rm(backup, { recursive: true, force: true }).catch(() => {
      // The backup is private and ignored; cleanup can be retried later.
    });
    return manifestPath;
  } catch (error) {
    if (movedNew) await rm(target, { recursive: true, force: true });
    if (movedOld) await rename(backup, target);
    throw error;
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

export async function preparePublishedImages(
  reader: ReaderTransport,
  environment: Environment,
  options: Options = {}
): Promise<{ snapshot: PublishedSnapshot; manifestPath: string }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const snapshot = await fetchPublishedSnapshot(reader, environment);
      const manifestPath = await materializePublishedImages(snapshot, reader, environment, options);
      return { snapshot, manifestPath };
    } catch (error) {
      if (!(error instanceof ReaderFailure) || !error.snapshotRetry || attempt === 2) throw error;
    }
  }
  throw new ReaderFailure('Published image snapshot retries exhausted');
}
