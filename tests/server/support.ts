import { env } from 'cloudflare:workers';
import { vi } from 'vite-plus/test';
import { getAuth } from '@/lib/auth.server';
import { upsertParticipant } from '@/lib/onboarding.server';

export const bindings = env as unknown as {
  DB: D1Database;
  TEST_MIGRATIONS: { name: string; queries: string[] }[];
  BETTER_AUTH_URL: string;
  GAS_URL: string;
  GAS_SECRET: string;
  ADMIN_EMAILS: string;
  REGISTRATION_DEADLINE: string;
  AI?: { run: ReturnType<typeof vi.fn> };
};

export const profile = {
  fullName: 'Test Participant',
  iin: '000000000001',
  phone: '77010000000',
  city: 'Astana',
  placeOfStudy: 'Nazarbayev University',
  educationLevel: "Bachelor's",
};

export async function seedParticipant(id: string) {
  await bindings.DB.prepare('INSERT INTO user (id, name, email) VALUES (?, ?, ?)')
    .bind(id, id, `${id}@example.test`)
    .run();
  await upsertParticipant({ userId: id, ...profile, fullName: id });
}

export function mockWebhook(
  respond: (body: Record<string, unknown>) => Response | Promise<Response> = () =>
    Response.json({ ok: true, fileId: 'testDriveFile123' }),
) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const request = new Request(input, init);
    if (request.url !== bindings.GAS_URL)
      throw new Error(`Unexpected outbound request: ${request.url}`);
    return respond((await request.json()) as Record<string, unknown>);
  });
}

export function authRequest(path: string, body?: object, cookie?: string) {
  return new Request(`${bindings.BETTER_AUTH_URL}/api/auth/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      origin: bindings.BETTER_AUTH_URL,
      ...(body && { 'content-type': 'application/json' }),
      ...(cookie && { cookie }),
    },
    ...(body && { body: JSON.stringify(body) }),
  });
}

export async function signIn(email = 'participant@example.test') {
  let otp = '';
  const webhook = mockWebhook((body) => {
    otp = String(body.otp);
    return Response.json({ ok: true });
  });
  const auth = getAuth();
  const sent = await auth.handler(
    authRequest('email-otp/send-verification-otp', { email, type: 'sign-in' }),
  );
  if (!sent.ok) throw new Error(`OTP delivery failed: ${await sent.text()}`);
  const response = await auth.handler(authRequest('sign-in/email-otp', { email, otp }));
  if (!response.ok) throw new Error(`OTP verification failed: ${await response.text()}`);
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ');
  const result = (await response.json()) as { user: { id: string; email: string } };
  webhook.mockRestore();
  return { cookie, user: result.user, otp };
}
