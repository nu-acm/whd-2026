import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { env } from 'cloudflare:workers';
import { TestD1 } from '@/test/d1';
import { Route } from '@/routes/api/cv';
import { CV_ERRORS, CV_MAX_BYTES, driveFileUrl } from '@/lib/cv';
import { getParticipant } from '@/lib/onboarding.server';
import { REGISTRATION_CLOSED_I18N_KEY } from '@/lib/registration.server';

const { getSession, callGas } = vi.hoisted(() => ({ getSession: vi.fn(), callGas: vi.fn() }));
vi.mock('@/lib/auth.server', () => ({ getSession }));
vi.mock('@/lib/gas.server', () => ({ callGas }));

const handlers = (() => {
  const configured = Route.options.server!.handlers!;
  if (typeof configured === 'function') throw new Error('Expected an object of CV handlers');
  return configured;
})();
let db: TestD1;
const fileId = 'testCvFile123';
const url = 'http://localhost:3000/api/cv';
const context = { params: {}, context: undefined, pathname: '/api/cv' as const, next: vi.fn() };
async function dispatch(request: Request) {
  const response = await (request.method === 'DELETE'
    ? handlers.DELETE!({ ...context, request })
    : handlers.POST!({ ...context, request }));
  if (!(response instanceof Response)) throw new Error('Expected a CV response');
  return response;
}
function uploadRequest(file: File | string = new File(['%PDF-1.7\ncontent'], 'cv.pdf')) {
  const form = new FormData();
  form.set('file', file);
  return new Request(url, { method: 'POST', body: form, headers: { origin: new URL(url).origin } });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-13T08:00:00Z'));
  db = new TestD1();
  db.seedUser('u0');
  Object.assign(env, { DB: db.binding });
  getSession.mockReset().mockResolvedValue({ user: { id: 'u0' } });
  callGas.mockReset().mockResolvedValue({ ok: true, fileId });
});
afterEach(() => {
  db.close();
  for (const key of ['DB', 'REGISTRATION_DEADLINE']) delete (env as Record<string, unknown>)[key];
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('CV request handlers', () => {
  it.each(['POST', 'DELETE'])(
    'rejects cross-origin %s requests before reading the session',
    async (method) => {
      const response = await dispatch(
        new Request(url, { method, headers: { origin: 'https://evil.example' } }),
      );
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: 'Forbidden' });
      expect(getSession).not.toHaveBeenCalled();
      expect(callGas).not.toHaveBeenCalled();
    },
  );

  it.each(['POST', 'DELETE'])('rejects anonymous %s requests', async (method) => {
    getSession.mockResolvedValue(null);
    const response = await dispatch(new Request(url, { method }));
    expect(response.status).toBe(401);
    expect(callGas).not.toHaveBeenCalled();
  });

  it.each(['POST', 'DELETE'])('blocks %s at the registration deadline', async (method) => {
    Object.assign(env, { REGISTRATION_DEADLINE: new Date(Date.now()).toISOString() });
    const response = await dispatch(new Request(url, { method }));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: REGISTRATION_CLOSED_I18N_KEY });
    expect(callGas).not.toHaveBeenCalled();
  });

  it('uploads and deletes the signed-in participant CV through real persistence', async () => {
    const uploaded = await dispatch(uploadRequest());
    expect(uploaded.status).toBe(200);
    expect(await uploaded.json()).toEqual({ ok: true });
    expect((await getParticipant('u0'))?.cvUrl).toBe(driveFileUrl(fileId));
    const removed = await dispatch(new Request(url, { method: 'DELETE' }));
    expect(removed.status).toBe(200);
    expect((await getParticipant('u0'))?.cvUrl).toBeNull();
    expect(callGas).toHaveBeenCalledWith('delete-cv', { fileId });
  });

  it('rejects oversized bodies before parsing multipart data', async () => {
    const response = await dispatch(
      new Request(url, {
        method: 'POST',
        headers: { 'content-length': String(CV_MAX_BYTES + 64 * 1024 + 1) },
      }),
    );
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: CV_ERRORS.tooLarge });
    expect(callGas).not.toHaveBeenCalled();
  });

  it.each([
    () => uploadRequest('not a file'),
    () => uploadRequest(new File(['<html>'], 'fake.pdf')),
    () => new Request(url, { method: 'POST', body: 'malformed multipart' }),
  ])('rejects invalid upload bodies without calling Drive', async (request) => {
    const response = await dispatch(request());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: CV_ERRORS.notPdf });
    expect(callGas).not.toHaveBeenCalled();
  });

  it('returns a translated error when upload fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    callGas.mockRejectedValue(new Error('Service unavailable'));
    const response = await dispatch(uploadRequest());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: CV_ERRORS.failed });
    expect((await getParticipant('u0'))?.cvUrl).toBeNull();
  });
});
