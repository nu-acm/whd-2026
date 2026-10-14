import { expect, it } from 'vite-plus/test';
import { safeInviteRedirect, validateRedirectSearch } from '@/lib/redirect';
import { onboardingSchema } from '@/lib/validation';
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

it('requires a valid guardian phone for school students and normalizes stored phone digits', () => {
  const school = { ...profile, educationLevel: 'School', phone: '+7 (701) 000-00-00' };
  expect(onboardingSchema.safeParse(school).success).toBe(false);
  expect(onboardingSchema.safeParse({ ...school, parentPhone: '(1)' }).success).toBe(false);
  expect(onboardingSchema.parse({ ...school, parentPhone: '+7 702 000 00 00' })).toMatchObject({
    phone: '77010000000',
    parentPhone: '77020000000',
  });
  expect(onboardingSchema.safeParse(profile).success).toBe(true);
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
