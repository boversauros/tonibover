import type { Loader } from 'astro/loaders';
import { adaptSnapshot, type SiteEntries } from '../aws-reader/adapt';
import { imagePathFromManifest } from '../aws-reader/image-manifest';
import { createReaderClient, readerConfig } from '../aws-reader/client';
import { preparePublishedImages } from '../aws-reader/materialize';
import { getPublishedSnapshot } from '../aws-reader/snapshot';

let entriesPromise: Promise<SiteEntries> | undefined;
let startedAt = 0;
const served = new Set<keyof SiteEntries>();

function getSiteEntries(name: keyof SiteEntries): Promise<SiteEntries> {
  if (
    import.meta.env.DEV &&
    entriesPromise &&
    (served.has(name) || Date.now() - startedAt > 15000)
  ) {
    entriesPromise = undefined;
    served.clear();
  }
  if (!entriesPromise) {
    startedAt = Date.now();
    const load = async () => {
      if (import.meta.env.DEV) {
        const config = readerConfig({ ...import.meta.env, ...process.env });
        const { snapshot, manifestPath } = await preparePublishedImages(
          createReaderClient(config),
          config.environment,
          {
            manifestPath:
              process.env.AWS_READER_IMAGE_MANIFEST || import.meta.env.AWS_READER_IMAGE_MANIFEST,
            region: config.region,
          }
        );
        return { snapshot, manifestPath };
      }
      return {
        snapshot: await getPublishedSnapshot(),
        manifestPath:
          process.env.AWS_READER_IMAGE_MANIFEST || import.meta.env.AWS_READER_IMAGE_MANIFEST,
      };
    };
    entriesPromise = load()
      .then(({ snapshot, manifestPath }) =>
        adaptSnapshot(snapshot, imagePathFromManifest(snapshot.revision, manifestPath))
      )
      .catch((error) => {
        entriesPromise = undefined;
        served.clear();
        throw error;
      });
  }
  served.add(name);
  return entriesPromise;
}

export function siteCollectionLoader(name: keyof SiteEntries): Loader {
  return {
    name: `tonibover-${name}`,
    async load({ store, logger, parseData, generateDigest }) {
      try {
        const entries = (await getSiteEntries(name))[name];
        const staged = await Promise.all(
          entries.map(async (entry) => {
            const data = await parseData({
              id: entry.id,
              data: entry as unknown as Record<string, unknown>,
            });
            return { id: entry.id, data, digest: generateDigest(data) };
          })
        );
        store.clear();
        for (const entry of staged) store.set(entry);
      } catch (error) {
        if (import.meta.env.DEV) {
          logger.warn(
            `[${name}] snapshot refresh failed; keeping cached entries: ${error instanceof Error ? error.message : String(error)}`
          );
          return;
        }
        throw error;
      }
    },
  };
}
