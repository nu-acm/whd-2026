import { expect, it, vi } from 'vite-plus/test';
import { ensureSession, getAuth, getSession } from '@/lib/auth.server';
import { sessionIsAdmin } from '@/lib/admin.server';
import { authRequest, bindings, mockWebhook, signIn } from './support';

it('requires delivered OTPs even when obsolete fixed-login settings remain', async () => {
  const obsolete = bindings as typeof bindings & Record<string, unknown>;
  Object.assign(obsolete, {
    DEMO_LOGIN_EMAIL: 'legacy@example.test',
    DEMO_LOGIN_CODE: '246810',
  });
  try {
    // signIn requires the actual mail delivery and verifies its generated code.
    const { cookie, user } = await signIn('legacy@example.test');
    expect((await ensureSession(authRequest('get-session', undefined, cookie))).user.id).toBe(
      user.id,
    );
  } finally {
    delete obsolete.DEMO_LOGIN_EMAIL;
    delete obsolete.DEMO_LOGIN_CODE;
  }
});

it('issues a real session after OTP verification and revokes it on sign-out', async () => {
  const { cookie, user, otp } = await signIn('admin@example.test');
  const request = authRequest('get-session', undefined, cookie);
  expect((await ensureSession(request)).user.id).toBe(user.id);
  expect(sessionIsAdmin(await getSession(request))).toBe(true);
  expect(sessionIsAdmin(null)).toBe(false);
  expect(sessionIsAdmin({ user: { email: 'outsider@example.test' } })).toBe(false);
  bindings.ADMIN_EMAILS = '';
  expect(sessionIsAdmin(await getSession(request))).toBe(false);
  const replay = await getAuth().handler(
    authRequest('sign-in/email-otp', { email: user.email, otp }),
  );
  expect(replay.ok).toBe(false);
  const signedOut = await getAuth().handler(authRequest('sign-out', {}, cookie));
  expect(signedOut.ok).toBe(true);
  expect(await getSession(request)).toBeNull();
  await expect(ensureSession(request)).rejects.toThrow('Unauthorized');
});

it('authorizes organisers from one comma- or whitespace-separated allowlist', () => {
  bindings.ADMIN_EMAILS = ' ADMIN@example.test, NEW-ADMIN@example.test\nother@example.test ';
  expect(sessionIsAdmin({ user: { email: 'admin@example.test' } })).toBe(true);
  expect(sessionIsAdmin({ user: { email: 'new-admin@example.test' } })).toBe(true);
  expect(sessionIsAdmin({ user: { email: 'other@example.test' } })).toBe(true);
  expect(sessionIsAdmin({ user: { email: 'outsider@example.test' } })).toBe(false);
  expect(sessionIsAdmin(null)).toBe(false);
  expect(sessionIsAdmin({ user: {} })).toBe(false);
  bindings.ADMIN_EMAILS = '';
  expect(sessionIsAdmin({ user: { email: 'admin@example.test' } })).toBe(false);
  expect(sessionIsAdmin({ user: { email: 'new-admin@example.test' } })).toBe(false);
});

it('rejects a wrong or expired OTP without creating a session', async () => {
  const email = 'rejected@example.test';
  let otp = '';
  mockWebhook((body) => {
    otp = String(body.otp);
    return Response.json({ ok: true });
  });
  const auth = getAuth();
  await auth.handler(authRequest('email-otp/send-verification-otp', { email, type: 'sign-in' }));
  const wrong = otp === '000000' ? '111111' : '000000';
  expect((await auth.handler(authRequest('sign-in/email-otp', { email, otp: wrong }))).ok).toBe(
    false,
  );
  await bindings.DB.prepare('UPDATE verification SET expires_at = ?')
    .bind(Date.now() - 1000)
    .run();
  expect((await auth.handler(authRequest('sign-in/email-otp', { email, otp }))).ok).toBe(false);
  expect((await bindings.DB.prepare('SELECT id FROM session').all()).results).toHaveLength(0);
  await expect(ensureSession(authRequest('get-session'))).rejects.toThrow('Unauthorized');
});

it('reports failed mail delivery instead of advancing login', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mockWebhook(() => Response.json({ ok: false, error: 'Delivery unavailable' }));
  const response = await getAuth().handler(
    authRequest('email-otp/send-verification-otp', {
      email: 'delivery@example.test',
      type: 'sign-in',
    }),
  );
  expect(response.status).toBe(502);
  expect((await response.json()) as object).toMatchObject({
    message: 'Could not send the sign-in code',
  });
  expect((await bindings.DB.prepare('SELECT id FROM session').all()).results).toHaveLength(0);
});

it('shares OTP limits across auth instances and permits delivery after the window expires', async () => {
  const webhook = mockWebhook();
  const request = () => {
    const request = authRequest('email-otp/send-verification-otp', {
      email: 'limited@example.test',
      type: 'sign-in',
    });
    request.headers.set('x-forwarded-for', `192.0.2.${Math.floor(Math.random() * 250) + 1}`);
    return request;
  };
  for (let i = 0; i < 3; i++) expect((await getAuth().handler(request())).status).toBe(200);

  const refused = await getAuth().handler(request());
  expect(refused.status).toBe(429);
  expect(Number(refused.headers.get('X-Retry-After'))).toBeGreaterThan(0);
  expect(webhook).toHaveBeenCalledTimes(3);
  expect((await bindings.DB.prepare('SELECT count FROM rate_limit').all()).results.length).toBe(1);

  await bindings.DB.prepare('UPDATE rate_limit SET last_request = ?')
    .bind(Date.now() - 61_000)
    .run();
  expect((await getAuth().handler(request())).status).toBe(200);
  expect(webhook).toHaveBeenCalledTimes(4);
});

it('admits only three concurrent OTP deliveries for the same client', async () => {
  const webhook = mockWebhook();
  const responses = await Promise.all(
    Array.from({ length: 6 }, (_, i) =>
      getAuth().handler(
        authRequest('email-otp/send-verification-otp', {
          email: `concurrent-${i}@example.test`,
          type: 'sign-in',
        }),
      ),
    ),
  );
  expect(responses.map((response) => response.status).sort((a, b) => a - b)).toEqual([
    200, 200, 200, 429, 429, 429,
  ]);
  expect(webhook).toHaveBeenCalledTimes(3);
});
