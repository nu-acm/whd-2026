import { applyD1Migrations } from 'cloudflare:test';
import { afterEach, beforeEach, vi } from 'vite-plus/test';
import { bindings } from './support';

await applyD1Migrations(bindings.DB, bindings.TEST_MIGRATIONS);

beforeEach(async () => {
  await bindings.DB.batch([
    bindings.DB.prepare('DELETE FROM user'),
    bindings.DB.prepare('DELETE FROM verification'),
  ]);
  bindings.REGISTRATION_DEADLINE = '2099-01-01T00:00:00Z';
  bindings.ADMIN_EMAILS = 'admin@example.test';
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete bindings.AI;
});
