// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@/test/render';
import { EmailForm } from './EmailForm';

const { sendSignInCode } = vi.hoisted(() => ({ sendSignInCode: vi.fn() }));
vi.mock('@/lib/auth-client', () => ({ sendSignInCode }));
vi.mock('web-haptics/react', () => ({ useWebHaptics: () => ({ trigger: vi.fn() }) }));
beforeEach(() => {
  sendSignInCode.mockReset();
});
afterEach(cleanup);

describe('email sign-in form', () => {
  it('shows validation feedback without sending an invalid email', async () => {
    const user = userEvent.setup();
    const onSent = vi.fn();
    const { i18n } = renderWithI18n(<EmailForm onSent={onSent} />);
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'invalid-email');
    await user.click(screen.getByRole('button', { name: 'Send code' }));
    expect((await screen.findByRole('alert')).textContent).toBe(i18n.t('validation.invalidEmail'));
    expect(sendSignInCode).not.toHaveBeenCalled();
    expect(onSent).not.toHaveBeenCalled();
  });

  it('advances only after the code is sent', async () => {
    const user = userEvent.setup();
    const onSent = vi.fn();
    let finish!: () => void;
    sendSignInCode.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    renderWithI18n(<EmailForm onSent={onSent} />);
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'participant@example.com');
    await user.click(screen.getByRole('button', { name: 'Send code' }));
    expect(screen.getByRole('button', { name: /loading/i })).toHaveProperty('disabled', true);
    expect(onSent).not.toHaveBeenCalled();
    finish();
    await screen.findByRole('button', { name: 'Send code' });
    expect(onSent).toHaveBeenCalledWith('participant@example.com');
  });

  it('shows a delivery error and allows another attempt', async () => {
    const user = userEvent.setup();
    const onSent = vi.fn();
    sendSignInCode
      .mockRejectedValueOnce(new Error('Service unavailable'))
      .mockResolvedValueOnce(undefined);
    const { i18n } = renderWithI18n(<EmailForm onSent={onSent} />);
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'participant@example.com');
    await user.click(screen.getByRole('button', { name: 'Send code' }));
    expect((await screen.findByRole('alert')).textContent).toBe(i18n.t('login.sendFailed'));
    expect(onSent).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Send code' }));
    expect(onSent).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
