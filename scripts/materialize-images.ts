import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { createReaderClient, readerConfig } from '../src/lib/aws-reader/client';
import { preparePublishedImages } from '../src/lib/aws-reader/materialize';

for (const file of ['.env.production', '.env']) {
  if (existsSync(file)) loadEnvFile(file);
}

try {
  const config = readerConfig(process.env);
  const { snapshot } = await preparePublishedImages(
    createReaderClient(config),
    config.environment,
    { region: config.region, manifestPath: process.env.AWS_READER_IMAGE_MANIFEST || undefined }
  );
  console.log(`Prepared images for ${snapshot.posts.length} published posts.`);
} catch (error) {
  // Transport errors and signed URLs must never reach build logs.
  console.error(error instanceof Error ? error.message : 'Image preparation failed');
  process.exitCode = 1;
}
