import { afterEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:workers';
import { getAdminEmails, sessionIsAdmin } from './admin.server';

afterEach(() => {
  delete (env as { ADMIN_EMAILS?: string }).ADMIN_EMAILS;
});

describe('admin allowlist', () => {
  it('denies access when no allowlist is configured', () => {
    expect(getAdminEmails()).toEqual([]);
    expect(sessionIsAdmin({ user: { email: 'admin@example.com' } })).toBe(false);
  });

  it('normalizes mixed delimiters and email case', () => {
    Object.assign(env, { ADMIN_EMAILS: ' Admin@example.com,\nsecond@example.com  ' });
    expect(getAdminEmails()).toEqual(['admin@example.com', 'second@example.com']);
    expect(sessionIsAdmin({ user: { email: 'ADMIN@example.com' } })).toBe(true);
  });

  it.each([
    null,
    { user: {} },
    { user: { email: null } },
    { user: { email: '' } },
    { user: { email: 'outsider@example.com' } },
    { user: { email: 'admin@example.com.evil' } },
  ])('denies sessions not explicitly listed: %j', (session) => {
    Object.assign(env, { ADMIN_EMAILS: 'admin@example.com' });
    expect(sessionIsAdmin(session)).toBe(false);
  });
});
