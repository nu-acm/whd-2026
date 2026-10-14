import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { env } from 'cloudflare:workers';
import { callGas, isGasConfigured } from './gas.server';

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  Object.assign(env, { GAS_URL: 'https://example.com/webhook', GAS_SECRET: 'test-secret' });
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  delete (env as { GAS_URL?: string }).GAS_URL;
  delete (env as { GAS_SECRET?: string }).GAS_SECRET;
  vi.unstubAllGlobals();
});

describe('Apps Script webhook', () => {
  it('requires both configuration values before sending a request', async () => {
    delete (env as { GAS_SECRET?: string }).GAS_SECRET;
    expect(isGasConfigured()).toBe(false);
    await expect(callGas('send-otp', {})).rejects.toThrow('not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the action, secret and payload and returns a successful reply', async () => {
    expect(isGasConfigured()).toBe(true);
    fetchMock.mockResolvedValue(Response.json({ ok: true, fileId: 'file1234567' }));
    await expect(callGas('upload-cv', { fileName: 'cv.pdf' })).resolves.toEqual({
      ok: true,
      fileId: 'file1234567',
    });
    expect(fetchMock).toHaveBeenCalledWith('https://example.com/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'test-secret', action: 'upload-cv', fileName: 'cv.pdf' }),
    });
  });

  it.each([
    [new Response('Unavailable', { status: 503 }), 'HTTP 503'],
    [Response.json({ ok: false, error: 'Permission denied' }), 'Permission denied'],
    [new Response('<html>error</html>'), 'non-JSON response'],
    [Response.json(null), 'non-JSON response'],
  ])('rejects unsuccessful webhook replies', async (reply, message) => {
    fetchMock.mockResolvedValue(reply);
    await expect(callGas('upload-cv', {})).rejects.toThrow(message);
  });

  it('propagates network failures', async () => {
    fetchMock.mockRejectedValue(new Error('Network unavailable'));
    await expect(callGas('upload-cv', {})).rejects.toThrow('Network unavailable');
  });
});
