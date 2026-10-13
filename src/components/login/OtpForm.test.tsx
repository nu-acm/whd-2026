// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@/test/render';
import { OtpForm } from './OtpForm';

const { verifyOtp, sendSignInCode } = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  sendSignInCode: vi.fn(),
}));
vi.mock('@/lib/auth-client', () => ({
  authClient: { signIn: { emailOtp: verifyOtp } },
  sendSignInCode,
}));
vi.mock('web-haptics/react', () => ({ useWebHaptics: () => ({ trigger: vi.fn() }) }));
const email = 'participant@example.com';
beforeEach(() => {
  // jsdom has no layout hit-testing; input-otp uses this to detect password-manager badges.
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => null });
  verifyOtp.mockReset().mockResolvedValue({ error: null });
  sendSignInCode.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('OTP form', () => {
  it('accepts six digits and advances after successful verification', async () => {
    const user = userEvent.setup();
    const onVerified = vi.fn();
    renderWithI18n(<OtpForm email={email} onVerified={onVerified} onChangeEmail={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Verify' })).toHaveProperty('disabled', true);
    await user.type(screen.getByRole('textbox', { name: /enter the code/i }), '12a3456');
    await user.click(screen.getByRole('button', { name: 'Verify' }));
    expect(verifyOtp).toHaveBeenCalledWith({ email, otp: '123456' });
    expect(onVerified).toHaveBeenCalledOnce();
  });

  it('pastes a formatted code, supports correction, and locks the input during verification', async () => {
    const user = userEvent.setup();
    let finish!: (value: { error: null }) => void;
    verifyOtp.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const onVerified = vi.fn();
    renderWithI18n(<OtpForm email={email} onVerified={onVerified} onChangeEmail={vi.fn()} />);
    const input = screen.getByRole('textbox', { name: /enter the code/i });
    await user.paste('123-456');
    expect(input).toHaveProperty('value', '123456');
    await user.keyboard('{Backspace}');
    expect(input).toHaveProperty('value', '12345');
    expect(screen.getByRole('button', { name: 'Verify' })).toHaveProperty('disabled', true);
    await user.keyboard('7');
    await user.click(screen.getByRole('button', { name: 'Verify' }));
    expect(verifyOtp).toHaveBeenCalledWith({ email, otp: '123457' });
    expect(input).toHaveProperty('disabled', true);
    expect(onVerified).not.toHaveBeenCalled();
    await act(async () => finish({ error: null }));
    expect(onVerified).toHaveBeenCalledOnce();
  });

  it('keeps the participant on the form when verification fails', async () => {
    const user = userEvent.setup();
    const onVerified = vi.fn();
    verifyOtp.mockResolvedValue({ error: { message: 'Wrong code' } });
    const { i18n } = renderWithI18n(
      <OtpForm email={email} onVerified={onVerified} onChangeEmail={vi.fn()} />,
    );
    await user.type(screen.getByRole('textbox', { name: /enter the code/i }), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify' }));
    expect((await screen.findByRole('alert')).textContent).toBe(i18n.t('login.verifyFailed'));
    expect(onVerified).not.toHaveBeenCalled();
  });

  it('enforces the resend cooldown, allows retry after failure, and restarts it on success', async () => {
    vi.useFakeTimers();
    sendSignInCode
      .mockRejectedValueOnce(new Error('Delivery failed'))
      .mockResolvedValueOnce(undefined);
    const { i18n } = renderWithI18n(
      <OtpForm email={email} onVerified={vi.fn()} onChangeEmail={vi.fn()} />,
    );
    const cooldown = screen.getByRole('button', { name: 'Resend in 30s' });
    fireEvent.click(cooldown);
    expect(sendSignInCode).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));
    });
    expect(screen.getByRole('alert').textContent).toBe(i18n.t('login.sendFailed'));
    expect(screen.getByRole('button', { name: 'Resend code' })).toHaveProperty('disabled', false);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));
    });
    expect(sendSignInCode).toHaveBeenCalledTimes(2);
    expect(sendSignInCode).toHaveBeenLastCalledWith(email);
    expect(screen.getByRole('button', { name: 'Resend in 30s' })).toHaveProperty('disabled', true);
  });
});
