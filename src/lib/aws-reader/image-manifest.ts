import { readFileSync, realpathSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { z } from 'zod';
import type { ImagePath } from './adapt';

const pathSchema = z.string().regex(/^\/content-images\/[A-Za-z0-9._-]+$/);
const manifestSchema = z
  .object({
    revision: z.number().int().nonnegative().safe(),
    images: z.record(
      z
        .object({
          version: z.number().int().positive().safe(),
          main: pathSchema.optional(),
          thumb: pathSchema.optional(),
        })
        .strict()
    ),
  })
  .strict();

export function imagePathFromManifest(
  revision: number,
  filename = process.env.AWS_READER_IMAGE_MANIFEST,
  publicRoot = resolve(process.cwd(), 'public')
): ImagePath {
  if (!filename)
    return () => {
      throw new Error('Published image materialization is required');
    };
  let manifest: z.infer<typeof manifestSchema>;
  try {
    manifest = manifestSchema.parse(JSON.parse(readFileSync(filename, 'utf8')));
  } catch {
    throw new Error('Invalid generated image manifest');
  }
  if (manifest.revision !== revision) throw new Error('Generated image manifest revision mismatch');
  return (post, role) => {
    const record = manifest.images[post.id];
    const url = record?.version === post.version ? record[role] : undefined;
    if (!url) throw new Error('Missing materialized published image');
    try {
      const directory = realpathSync(resolve(publicRoot, 'content-images'));
      const file = realpathSync(resolve(publicRoot, `.${url}`));
      if (!file.startsWith(`${directory}${sep}`) || !statSync(file).isFile()) throw new Error();
    } catch {
      throw new Error('Materialized published image file is missing');
    }
    return url;
  };
}
