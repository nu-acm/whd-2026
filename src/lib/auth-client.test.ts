import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendOtp } = vi.hoisted(() => ({ sendOtp: vi.fn() }));
vi.mock('better-auth/react', () => ({
  createAuthClient: () => ({ emailOtp: { sendVerificationOtp: sendOtp } }),
}));
vi.mock('better-auth/client/plugins', () => ({ emailOTPClient: () => ({}) }));

import { sendSignInCode } from './auth-client';

beforeEach(() => {
  sendOtp.mockReset();
});

describe('initial send and resend', () => {
  it('rejects a resolved API error so the form does not report success', async () => {
    sendOtp.mockResolvedValue({ error: { message: 'Delivery failed' } });
    await expect(sendSignInCode('review@example.com')).rejects.toThrow('login.sendFailed');
  });

  it('passes through a network rejection to the form error handler', async () => {
    sendOtp.mockRejectedValue(new Error('Network unavailable'));
    await expect(sendSignInCode('review@example.com')).rejects.toThrow('Network unavailable');
  });

  it('resolves only when the API reports successful delivery', async () => {
    sendOtp.mockResolvedValue({ error: null });
    await expect(sendSignInCode('review@example.com')).resolves.toBeUndefined();
    expect(sendOtp).toHaveBeenCalledWith({ email: 'review@example.com', type: 'sign-in' });
  });
});
