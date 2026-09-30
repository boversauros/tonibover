/**
 * Replaces the network boundary of the site loader during fixture builds.
 *
 * The real `fetchPublishedSnapshot` still runs, so paging, schema checks,
 * catalog links, duplicate routes and private-URL checks are all exercised.
 * Only the Lambda transport and the image manifest are swapped out.
 */
import { readFileSync } from 'node:fs';
import type { ReaderTransport } from '../../src/lib/aws-reader/client';
import type { Catalog, PublishedPost, ReaderRequest } from '../../src/lib/aws-reader/contract';
import type { ImagePath } from '../../src/lib/aws-reader/adapt';
import { fetchPublishedSnapshot, type PublishedSnapshot } from '../../src/lib/aws-reader/snapshot';

export type SiteFixture = {
  revision: number;
  catalog: Catalog;
  posts: PublishedPost[];
  /** Raw detail payloads that replace a post, for malformed-payload builds. */
  rawDetails?: Record<string, unknown>;
};

function fixtureTransport(fixture: SiteFixture): ReaderTransport {
  const pageSize = 50;
  return {
    async invoke(request: ReaderRequest) {
      switch (request.operation) {
        case 'revision':
          return { revision: fixture.revision };
        case 'catalog':
          return fixture.catalog;
        case 'posts': {
          const start = request.cursor ? Number(request.cursor) : 0;
          const items = fixture.posts
            .slice(start, start + pageSize)
            .map(({ id, version }) => ({ id, version }));
          const next = start + pageSize;
          return { items, nextCursor: next < fixture.posts.length ? String(next) : null };
        }
        case 'post':
          return (
            fixture.rawDetails?.[request.id] ??
            fixture.posts.find((post) => post.id === request.id) ??
            null
          );
        default:
          throw new Error(`Unexpected fixture operation ${request.operation}`);
      }
    },
  };
}

export function getPublishedSnapshot(): Promise<PublishedSnapshot> {
  const path = process.env.SITE_FIXTURE_PATH;
  if (!path) throw new Error('SITE_FIXTURE_PATH is required for fixture builds');
  const fixture = JSON.parse(readFileSync(path, 'utf8')) as SiteFixture;
  return fetchPublishedSnapshot(fixtureTransport(fixture), 'dev');
}

/** Stable fake paths; real manifest validation is covered by image-manifest.test.ts. */
export function imagePathFromManifest(): ImagePath {
  return (post, role) => `/content-images/${post.id}-${role}.webp`;
}
