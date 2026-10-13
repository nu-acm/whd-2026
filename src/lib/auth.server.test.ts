import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from 'cloudflare:workers';

type OtpData = { email: string; otp: string; type: string };
const { delivery, callGas, configured, readSession } = vi.hoisted(() => ({
  delivery: { current: undefined as undefined | ((data: OtpData) => Promise<void>) },
  callGas: vi.fn(),
  configured: vi.fn(),
  readSession: vi.fn(),
}));
vi.mock('better-auth', () => ({ betterAuth: () => ({ api: { getSession: readSession } }) }));
vi.mock('better-auth/adapters/drizzle', () => ({ drizzleAdapter: () => ({}) }));
vi.mock('better-auth/plugins', () => ({
  emailOTP: (options: { sendVerificationOTP: (data: OtpData) => Promise<void> }) => {
    delivery.current = options.sendVerificationOTP;
    return {};
  },
}));
vi.mock('@/db', () => ({ getDb: () => ({}) }));
vi.mock('@/lib/gas.server', () => ({ callGas, isGasConfigured: configured }));

import {
  ensureSession,
  getAuth,
  getDemoLogin,
  getSession,
  isGoogleSignInEnabled,
} from './auth.server';

const otp = { email: 'review@example.com', otp: '123456', type: 'sign-in' };

beforeEach(() => {
  Object.assign(env, {
    DB: {},
    BETTER_AUTH_SECRET: 'test-only-secret-for-signing-sessions',
    BETTER_AUTH_URL: 'http://localhost:3000',
  });
  configured.mockReset().mockReturnValue(true);
  callGas.mockReset().mockResolvedValue({ ok: true });
  readSession.mockReset().mockResolvedValue(null);
  getAuth();
});

afterEach(() => {
  for (const key of [
    'DB',
    'BETTER_AUTH_SECRET',
    'BETTER_AUTH_URL',
    'DEMO_LOGIN_EMAIL',
    'DEMO_LOGIN_CODE',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ]) {
    delete (env as Record<string, unknown>)[key];
  }
  vi.restoreAllMocks();
});

describe('OTP delivery callback', () => {
  it('rejects a webhook failure instead of claiming the code was sent', async () => {
    callGas.mockRejectedValue(new Error('Webhook unavailable'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(delivery.current!(otp)).rejects.toThrow('Could not send the sign-in code');
  });

  it('resolves after a successful mail webhook response', async () => {
    await expect(delivery.current!(otp)).resolves.toBeUndefined();
    expect(callGas).toHaveBeenCalledWith('send-otp', otp);
  });

  it('keeps console OTP delivery working when no webhook is configured', async () => {
    configured.mockReturnValue(false);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await expect(delivery.current!(otp)).resolves.toBeUndefined();
    expect(callGas).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('otp=123456'));
  });
});

describe('session checks', () => {
  const request = new Request('http://localhost:3000/dashboard', {
    headers: { cookie: 'test-session' },
  });

  it('rejects signed-out requests', async () => {
    expect(await getSession(request)).toBeNull();
    await expect(ensureSession(request)).rejects.toThrow('Unauthorized');
  });

  it('passes request headers to auth and returns the authenticated session', async () => {
    const session = { user: { id: 'u0', email: 'u0@example.com' } };
    readSession.mockResolvedValue(session);
    await expect(ensureSession(request)).resolves.toEqual(session);
    expect(readSession).toHaveBeenCalledWith({ headers: request.headers });
  });

  it('denies access when session lookup fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    readSession.mockRejectedValue(new Error('Database unavailable'));
    await expect(ensureSession(request)).rejects.toThrow('Unauthorized');
  });

  it.each(['DB', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL'])(
    'fails auth configuration without %s',
    (key) => {
      delete (env as Record<string, unknown>)[key];
      expect(() => getAuth()).toThrow();
    },
  );
});

describe('optional login providers', () => {
  it('offers Google sign-in only when both credentials are configured', () => {
    expect(isGoogleSignInEnabled()).toBe(false);
    Object.assign(env, { GOOGLE_CLIENT_ID: 'test-client' });
    expect(isGoogleSignInEnabled()).toBe(false);
    Object.assign(env, { GOOGLE_CLIENT_SECRET: 'test-secret' });
    expect(isGoogleSignInEnabled()).toBe(true);
    expect(() => getAuth()).not.toThrow();
  });

  it('enables the demo login only with a valid email and six-digit code', async () => {
    expect(getDemoLogin()).toBeNull();
    Object.assign(env, { DEMO_LOGIN_EMAIL: ' Demo@example.com ', DEMO_LOGIN_CODE: 'abc123' });
    expect(getDemoLogin()).toBeNull();
    Object.assign(env, { DEMO_LOGIN_CODE: '123456' });
    expect(getDemoLogin()).toEqual({ email: 'demo@example.com', code: '123456' });
    getAuth();
    await delivery.current!({ ...otp, email: 'DEMO@example.com' });
    expect(callGas).not.toHaveBeenCalled();
  });
});
