import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The web app's tests cover its pure client-side logic — storage, timing, wording.
    // Anything needing a DOM is covered by Playwright instead, where it is real.
    include: ['packages/*/test/**/*.test.ts', 'apps/api/test/**/*.test.ts', 'apps/web/test/**/*.test.ts'],
    environment: 'node',
    testTimeout: 15_000,
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
    },
  },
});
