import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { imagePathFromManifest } from './image-manifest';
import { post } from './fixtures.test-support';

const tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'tonibover-images-'));
  tempDirs.push(root);
  const publicRoot = join(root, 'public');
  mkdirSync(join(publicRoot, 'content-images'), { recursive: true });
  const manifest = join(root, 'manifest.json');
  writeFileSync(
    manifest,
    JSON.stringify({
      revision: 7,
      images: { '1': { version: 1, main: '/content-images/hash.jpg' } },
    })
  );
  return { root, publicRoot, manifest };
}

describe('generated image manifest', () => {
  it('requires a matching revision, post version, and a real local file', () => {
    const { publicRoot, manifest } = fixture();
    expect(() => imagePathFromManifest(8, manifest, publicRoot)).toThrow(/revision mismatch/);
    const path = imagePathFromManifest(7, manifest, publicRoot);
    expect(() => path(post(), 'main')).toThrow(/file is missing/);
    writeFileSync(join(publicRoot, 'content-images', 'hash.jpg'), 'image bytes');
    expect(path(post(), 'main')).toBe('/content-images/hash.jpg');
    expect(() => path(post('1', { version: 2 }), 'main')).toThrow(/Missing materialized/);
  });

  it('rejects a generated path that resolves outside the asset directory', () => {
    const { root, publicRoot, manifest } = fixture();
    writeFileSync(join(root, 'private.jpg'), 'private');
    symlinkSync(join(root, 'private.jpg'), join(publicRoot, 'content-images', 'hash.jpg'));
    expect(() => imagePathFromManifest(7, manifest, publicRoot)(post(), 'main')).toThrow(
      /file is missing/
    );
  });
});
