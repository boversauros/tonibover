import { defineConfig } from 'vitest/config';

// Fixture `astro build` runs, kept out of `pnpm test` because each build takes seconds.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/site-build/**/*.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 300_000,
  },
});
