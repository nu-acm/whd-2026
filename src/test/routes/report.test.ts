import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { env } from 'cloudflare:workers';
import { TestD1 } from '@/test/d1';
import { Route } from '@/routes/api/report';

const handlers = (() => {
  const configured = Route.options.server!.handlers!;
  if (typeof configured === 'function') throw new Error('Expected an object of report handlers');
  return configured;
})();
let db: TestD1;
const url = 'http://localhost:3000/api/report';
async function dispatch(request: Request) {
  const handler = request.method === 'GET' ? handlers.GET! : handlers.POST!;
  const response = await handler({
    request,
    params: {},
    context: undefined,
    pathname: '/api/report',
    next: vi.fn(),
  });
  if (!(response instanceof Response)) throw new Error('Expected a report response');
  return response;
}
const post = (body: unknown) =>
  dispatch(new Request(url, { method: 'POST', body: JSON.stringify(body) }));
beforeEach(() => {
  db = new TestD1();
  db.seedUser('u0');
  Object.assign(env, { DB: db.binding, GAS_SECRET: 'test-report-secret' });
});
afterEach(() => {
  db.close();
  for (const key of ['DB', 'GAS_SECRET']) delete (env as Record<string, unknown>)[key];
  vi.restoreAllMocks();
});

describe('report request handlers', () => {
  it('refuses GET', async () => {
    expect((await dispatch(new Request(url))).status).toBe(405);
  });

  it('refuses requests when the API secret is not configured', async () => {
    delete (env as { GAS_SECRET?: string }).GAS_SECRET;
    expect((await post({ secret: 'test-report-secret' })).status).toBe(500);
  });

  it.each([{}, { secret: 42 }, { secret: 'wrong' }, { secret: 'test-report-secret-extra' }])(
    'refuses invalid credentials: %j',
    async (body) => {
      const response = await post(body);
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    },
  );

  it.each([null, [], 'text', 42])('refuses unexpected JSON shapes: %j', async (body) => {
    const response = await post(body);
    expect(response.status).toBe(401);
  });

  it('rejects malformed JSON', async () => {
    const response = await dispatch(new Request(url, { method: 'POST', body: '{' }));
    expect(response.status).toBe(400);
  });

  it('returns the actual report only with the correct secret', async () => {
    const response = await post({ secret: 'test-report-secret' });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(await response.json()).toMatchObject({
      participants: [{ id: 'u0', email: 'u0@example.com' }],
      stats: { participants: 1, teams: 0, eligibleTeams: 0, teamless: 1, attended: 0 },
    });
  });

  it('returns a safe error if the database is unavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    db.failWhen = () => true;
    const response = await post({ secret: 'test-report-secret' });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Failed to fetch report data' });
  });
});
