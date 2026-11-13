import { expect, it } from 'vite-plus/test';
import { sessionIsAdmin } from '@/lib/admin.server';
import { ensureCheckinAccess, sessionCanCheckin } from '@/lib/checkin-access.server';
import { loadJury } from '@/lib/scoring.server';
import { ensureScoringAdmin } from '@/lib/jury.server';
import { authRequest, bindings, signIn } from './support';

it('allows admins and configured check-in staff without granting staff admin access', () => {
  expect(sessionCanCheckin(null)).toBe(false);
  expect(sessionCanCheckin({ user: {} })).toBe(false);
  expect(sessionCanCheckin({ user: { email: 'checkin@example.test' } })).toBe(false);
  expect(sessionCanCheckin({ user: { email: 'admin@example.test' } })).toBe(true);
  bindings.CHECKIN_EMAILS = ' CHECKIN@example.test, second@example.test\nthird@example.test ';
  for (const email of [' CHECKIN@example.test ', 'second@example.test', 'third@example.test']) {
    expect(sessionCanCheckin({ user: { email } })).toBe(true);
    expect(sessionIsAdmin({ user: { email } })).toBe(false);
  }
  expect(sessionCanCheckin({ user: { email: 'outsider@example.test' } })).toBe(false);
  bindings.CHECKIN_EMAILS = ' , \n ';
  expect(sessionCanCheckin({ user: { email: 'checkin@example.test' } })).toBe(false);
  expect(sessionCanCheckin({ user: { email: 'admin@example.test' } })).toBe(true);
});

it('checks the current allowlist for real sessions and keeps other workspaces restricted', async () => {
  bindings.CHECKIN_EMAILS = 'checkin@example.test';
  bindings.JURY_EMAILS = 'judge@example.test';
  const requestFor = async (email: string) =>
    authRequest('get-session', undefined, (await signIn(email)).cookie);
  const staff = await requestFor('checkin@example.test');
  const admin = await requestFor('admin@example.test');
  const judge = await requestFor('judge@example.test');
  expect((await ensureCheckinAccess(staff)).user.email).toBe('checkin@example.test');
  expect((await ensureCheckinAccess(admin)).user.email).toBe('admin@example.test');
  for (const request of [judge, authRequest('get-session')])
    await expect(ensureCheckinAccess(request)).rejects.toThrow('Forbidden');
  await expect(ensureScoringAdmin(staff)).rejects.toThrow('Forbidden');
  await expect(loadJury(staff)).rejects.toThrow('Forbidden');
  bindings.CHECKIN_EMAILS = '';
  await expect(ensureCheckinAccess(staff)).rejects.toThrow('Forbidden');
  expect((await ensureCheckinAccess(admin)).user.email).toBe('admin@example.test');
});
