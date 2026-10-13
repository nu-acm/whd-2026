import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP } from 'better-auth/plugins';
import { APIError } from 'better-auth/api';
import { env } from 'cloudflare:workers';
import { getDb } from '@/db';
import { user, session, account, verification } from '@/db/auth-schema';
import { callGas, isGasConfigured } from '@/lib/gas.server';

interface AuthEnv {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  DEMO_LOGIN_EMAIL?: string;
  DEMO_LOGIN_CODE?: string;
}

const DEMO_CODE_PATTERN = /^\d{6}$/;

/**
 * TEMPORARY, for showing the admin panel to others. When both DEMO_LOGIN_*
 * vars are set, that one email always gets the fixed code (no email is sent),
 * and the login page displays it. Remove the vars to turn this off.
 */
export function getDemoLogin() {
  const { DEMO_LOGIN_EMAIL, DEMO_LOGIN_CODE } = env as unknown as AuthEnv;
  const email = DEMO_LOGIN_EMAIL?.trim().toLowerCase();
  if (!email || !DEMO_LOGIN_CODE || !DEMO_CODE_PATTERN.test(DEMO_LOGIN_CODE)) return null;
  return { email, code: DEMO_LOGIN_CODE };
}

function isDemoEmail(email: string) {
  return getDemoLogin()?.email === email.trim().toLowerCase();
}

/** True when both Google OAuth secrets are set, so the login page can offer it. */
export function isGoogleSignInEnabled() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = env as unknown as AuthEnv;
  return !!GOOGLE_CLIENT_ID && !!GOOGLE_CLIENT_SECRET;
}

/**
 * Request-time auth instance. Reads the D1 binding and secrets from the Workers
 * env, so it may only be imported from server code (server functions, API
 * routes) — never from a component.
 */
export function getAuth() {
  const authEnv = env as unknown as AuthEnv;
  const { DB: d1Binding, BETTER_AUTH_SECRET: secret, BETTER_AUTH_URL: url } = authEnv;

  if (!secret)
    throw new Error('BETTER_AUTH_SECRET is not set — copy .dev.vars.example to .dev.vars');
  if (!url) throw new Error('BETTER_AUTH_URL is not set — copy .dev.vars.example to .dev.vars');
  if (!d1Binding) throw new Error('D1 binding (DB) is not configured — check wrangler.jsonc');

  const db = getDb(d1Binding);
  const { GOOGLE_CLIENT_ID: googleId, GOOGLE_CLIENT_SECRET: googleSecret } = authEnv;

  const socialProviders =
    googleId && googleSecret
      ? { google: { clientId: googleId, clientSecret: googleSecret } }
      : undefined;

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: { user, session, account, verification },
    }),
    secret,
    appName: "Women's Hack Day",
    baseURL: url,
    ...(socialProviders && { socialProviders }),
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        // Undefined falls back to Better Auth's random code.
        generateOTP: ({ email }) => (isDemoEmail(email) ? getDemoLogin()?.code : undefined),
        async sendVerificationOTP({ email, otp, type }) {
          if (isDemoEmail(email)) return;
          // Without a mail webhook configured, print the code so local
          // development works with no external service.
          if (!isGasConfigured()) {
            console.log(`[OTP] type=${type} email=${email} otp=${otp}`);
            return;
          }
          try {
            await callGas('send-otp', { email, otp, type });
          } catch (err) {
            console.error('[OTP] failed to send the code:', err);
            throw new APIError('BAD_GATEWAY', { message: 'Could not send the sign-in code' });
          }
        },
      }),
    ],
  });
}

/** Read the current session from request headers. Returns null when signed out. */
export async function getSession(request: Request) {
  try {
    return await getAuth().api.getSession({ headers: request.headers });
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

/** Same as getSession, but throws when there is no session. */
export async function ensureSession(request: Request) {
  const session = await getSession(request);
  if (!session) throw new Error('Unauthorized');
  return session;
}
