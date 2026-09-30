// Builds the site from a fixture snapshot in its own process:
//   node tests/site-build/build.mjs <fixture.json> <outDir> <cacheDir>
// Only the loader's snapshot and image-manifest imports are redirected, so
// the build never reads AWS and never touches dist/ or the shared cache.
import { build } from 'astro';
import { fileURLToPath } from 'node:url';

const [fixturePath, outDir, cacheDir] = process.argv.slice(2);
if (!fixturePath || !outDir || !cacheDir) {
  console.error('usage: build.mjs <fixture.json> <outDir> <cacheDir>');
  process.exit(2);
}

const root = fileURLToPath(new URL('../../', import.meta.url));
const fixtureReader = fileURLToPath(new URL('./fixture-reader.ts', import.meta.url));
const redirected = new Set(['../aws-reader/snapshot', '../aws-reader/image-manifest']);
let redirects = 0;

process.env.SITE_FIXTURE_PATH = fixturePath;
for (const name of Object.keys(process.env)) {
  if (name.startsWith('AWS_') || name === 'VERCEL_OIDC_TOKEN') delete process.env[name];
}

await build({
  root,
  outDir,
  cacheDir,
  logLevel: 'warn',
  vite: {
    plugins: [
      {
        name: 'site-fixture-reader',
        enforce: 'pre',
        resolveId(source, importer) {
          if (
            importer?.endsWith('/src/lib/loaders/site-collections.ts') &&
            redirected.has(source)
          ) {
            redirects += 1;
            return fixtureReader;
          }
          return null;
        },
      },
    ],
  },
});

if (redirects === 0) {
  console.error('Fixture reader was never used; refusing to trust this build');
  process.exit(1);
}
