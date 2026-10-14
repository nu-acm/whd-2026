// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@/test/render';
import { onboardingSchema } from '@/lib/validation';
import { REGISTRATION_CLOSED_I18N_KEY } from '@/lib/registration';
import { OnboardingForm, type OnboardingDefaults } from './OnboardingForm';

vi.mock('web-haptics/react', () => ({ useWebHaptics: () => ({ trigger: vi.fn() }) }));
afterEach(cleanup);

const defaults: OnboardingDefaults = {
  fullName: 'QA Participant',
  iin: '050919501086',
  phone: '77001234567',
  city: 'Shymkent',
  placeOfStudy: 'QA University',
  educationLevel: "Bachelor's",
};

describe('profile validation feedback', () => {
  it('rejects a formatted phone with too few digits before submitting', async () => {
    const onSubmit = vi.fn();
    const { i18n } = renderWithI18n(
      <OnboardingForm defaults={{ ...defaults, phone: '1-----' }} onSubmit={onSubmit} />,
    );
    await userEvent.click(screen.getByRole('button', { name: i18n.t('onboarding.submit') }));
    expect(screen.getByRole('alert').textContent).toBe(i18n.t('validation.phoneInvalid'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('maps serialized server validation issues to translated field feedback', async () => {
    const result = onboardingSchema.safeParse({ ...defaults, phone: '1-----' });
    const onSubmit = vi.fn().mockRejectedValue(new Error(result.error!.message));
    const { i18n } = renderWithI18n(<OnboardingForm defaults={defaults} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: i18n.t('onboarding.submit') }));
    expect((await screen.findByRole('alert')).textContent).toBe(i18n.t('validation.phoneInvalid'));
    expect(screen.getByRole('textbox', { name: /phone/i }).getAttribute('aria-invalid')).toBe(
      'true',
    );
  });

  it.each([
    [REGISTRATION_CLOSED_I18N_KEY, REGISTRATION_CLOSED_I18N_KEY],
    ['Internal database detail', 'onboarding.saveFailed'],
    ['[{"path":["phone"],"message":"Unknown internal detail"}]', 'onboarding.saveFailed'],
  ])('shows safe feedback for server error %s', async (message, key) => {
    const onSubmit = vi.fn().mockRejectedValue(new Error(message));
    const { i18n } = renderWithI18n(<OnboardingForm defaults={defaults} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: i18n.t('onboarding.submit') }));
    expect((await screen.findByRole('alert')).textContent).toBe(i18n.t(key));
  });
});
