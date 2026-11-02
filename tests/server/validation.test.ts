import { expect, it } from 'vite-plus/test';
import { safeInviteRedirect, validateRedirectSearch } from '@/lib/redirect';
import {
  createTeamSchema,
  EDUCATION_LEVELS,
  onboardingSchema,
  requiresGuardianPhone,
} from '@/lib/validation';
import en from '@/i18n/locales/en.json';
import ru from '@/i18n/locales/ru.json';
import kk from '@/i18n/locales/kk.json';
import { profile } from './support';

it('carries valid invite paths through login while discarding unsafe redirects', () => {
  expect(safeInviteRedirect('/invite/team-123')).toBe('/invite/team-123');
  for (const value of [
    'https://other.test',
    '//other.test',
    '/invite/../admin',
    '/dashboard',
    ['invite'],
  ]) {
    expect(safeInviteRedirect(value)).toBeUndefined();
    expect(validateRedirectSearch({ redirect: value })).toEqual({ redirect: undefined });
  }
});

it('requires a valid guardian phone for minors at every study level and normalizes phone digits', () => {
  for (const educationLevel of EDUCATION_LEVELS) {
    const minor = { ...profile, iin: '101101600001', educationLevel };
    expect(onboardingSchema.safeParse(minor).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...minor, parentPhone: '(1)' }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...minor, parentPhone: '+7 702 000 00 00' }).success).toBe(
      true,
    );
    expect(onboardingSchema.safeParse({ ...profile, educationLevel }).success).toBe(true);
  }
  expect(
    onboardingSchema.parse({
      ...profile,
      iin: '101101600001',
      educationLevel: 'College',
      phone: '+7 (701) 000-00-00',
      parentPhone: '+7 702 000 00 00',
    }),
  ).toMatchObject({
    phone: '77010000000',
    parentPhone: '77020000000',
  });
  expect(onboardingSchema.safeParse(profile).success).toBe(true);
});

it('checks age on the event date and requires a contact for unusable IIN birth dates', () => {
  // Turning 18 on the event day is adult; turning 18 the next day still needs a contact.
  expect(requiresGuardianPhone('081114600001')).toBe(false);
  expect(requiresGuardianPhone('081115600001')).toBe(true);
  expect(requiresGuardianPhone('081110600001')).toBe(false);
  expect(requiresGuardianPhone('101101600001')).toBe(true);
  expect(requiresGuardianPhone('080229600001')).toBe(false);
  expect(requiresGuardianPhone('080101400001')).toBe(false);
  for (const iin of ['000000000001', '090229600001', '070101700001', '991101600001']) {
    expect(requiresGuardianPhone(iin)).toBe(true);
    expect(onboardingSchema.safeParse({ ...profile, iin }).success).toBe(false);
    expect(
      onboardingSchema.safeParse({ ...profile, iin, parentPhone: '77020000000' }).success,
    ).toBe(true);
  }
  const invalidIin = onboardingSchema.safeParse({ ...profile, iin: 'not-an-iin' });
  expect(invalidIin.error?.issues).toContainEqual(
    expect.objectContaining({ path: ['iin'], message: 'validation.iinInvalid' }),
  );
});

it('rejects team names the Codeforces users file cannot carry', () => {
  expect(createTeamSchema.parse({ name: '  Binary Blossoms ' })).toEqual({
    name: 'Binary Blossoms',
  });
  for (const name of ['Bits | Bytes', 'Line\nBreak', 'Carriage\rReturn'])
    expect(createTeamSchema.safeParse({ name }).error?.issues[0]?.message).toBe(
      'validation.teamNameChars',
    );
});

it('provides the same translation keys in each supported language', () => {
  function keys(value: object, prefix = ''): string[] {
    return Object.entries(value)
      .flatMap(([key, child]) =>
        typeof child === 'object' && child !== null
          ? keys(child, `${prefix}${key}.`)
          : [`${prefix}${key}`],
      )
      .sort();
  }
  expect(keys(ru)).toEqual(keys(en));
  expect(keys(kk)).toEqual(keys(en));
});

it('requires explicit consent to the current policy version', () => {
  for (const consent of [undefined, false, 'true']) {
    const result = onboardingSchema.safeParse({ ...profile, consent });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ path: ['consent'], message: 'validation.consentRequired' }),
      );
  }
  expect(onboardingSchema.safeParse({ ...profile, policyVersion: '2026-10-01' }).success).toBe(
    false,
  );
  expect(onboardingSchema.safeParse(profile).success).toBe(true);
});
