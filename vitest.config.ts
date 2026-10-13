import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Separate from vite.config.ts: the Cloudflare and TanStack Start plugins
// expect a Workers runtime. These tests run helpers and SQLite integrations in Node.
export default defineConfig({
  plugins: [tsconfigPaths({ projects: ['./tsconfig.json'] })],
  resolve: {
    alias: {
      // Tests supply isolated bindings instead of calling Cloudflare services.
      'cloudflare:workers': fileURLToPath(
        new URL('./src/test/cloudflare-workers.ts', import.meta.url),
      ),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
