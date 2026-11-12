import { env } from 'cloudflare:workers';
import { getSession } from '@/lib/auth.server';
import { sessionIsAdmin } from '@/lib/admin.server';

/** Jury access is configured by email, independently of sign-in and stored assignments. */
export function getJuryEmails(): string[] {
  const raw = (env as unknown as { JURY_EMAILS?: string }).JURY_EMAILS?.trim();
  if (!raw) return [];
  return [...new Set(raw.split(/[,\s]+/).map((email) => email.toLowerCase()))].filter(
    (email) => email && !sessionIsAdmin({ user: { email } }),
  );
}

/** A jury role never grants access to registration data, attendance, or contest credentials. */
export function sessionIsJury(session: { user: { email?: string | null } } | null): boolean {
  const email = session?.user.email?.trim().toLowerCase();
  return !!email && getJuryEmails().includes(email);
}

export async function ensureJury(request: Request) {
  const session = await getSession(request);
  if (!session || !sessionIsJury(session)) throw new Error('Forbidden');
  return session.user.email.trim().toLowerCase();
}

export async function ensureScoringAdmin(request: Request) {
  const session = await getSession(request);
  if (!session || !sessionIsAdmin(session)) throw new Error('Forbidden');
  return session;
}
