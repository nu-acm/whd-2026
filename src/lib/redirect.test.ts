import { describe, expect, it } from 'vite-plus/test';
import { safeInviteRedirect, validateRedirectSearch } from '@/lib/redirect';

describe('safeInviteRedirect', () => {
  it('accepts an invite path', () => {
    expect(safeInviteRedirect('/invite/binary-blossoms')).toBe('/invite/binary-blossoms');
  });

  it.each([
    'https://evil.example/invite/x',
    '//evil.example',
    '/dashboard',
    '/invite/',
    '/invite/../admin',
    '/invite/a/b',
    '/invite/UPPER',
    42,
    undefined,
  ])('rejects %s', (value) => {
    expect(safeInviteRedirect(value)).toBeUndefined();
  });
});

describe('validateRedirectSearch', () => {
  it('overwrites unsafe values with undefined', () => {
    expect(validateRedirectSearch({ redirect: '//evil.example' })).toEqual({ redirect: undefined });
  });

  it('keeps a safe invite path', () => {
    expect(validateRedirectSearch({ redirect: '/invite/abc' })).toEqual({
      redirect: '/invite/abc',
    });
  });
});
