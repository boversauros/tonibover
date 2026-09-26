import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const output = resolve('node_modules/.cache/tonibover/materialize-runner.mjs');
await mkdir(resolve(output, '..'), { recursive: true });
await build({
  entryPoints: ['scripts/materialize-images.ts'],
  outfile: output,
  bundle: true,
  packages: 'external',
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});
await import(pathToFileURL(output).href);
