import { env } from 'cloudflare:workers';
import { getSession } from '@/lib/auth.server';
import { sessionIsAdmin } from '@/lib/admin.server';

/** Check-in staff can view finalized rosters and change attendance. Admins retain access. */
export function sessionCanCheckin(session: { user: { email?: string | null } } | null): boolean {
  if (sessionIsAdmin(session)) return true;
  const email = session?.user.email?.trim().toLowerCase();
  const raw = (env as unknown as { CHECKIN_EMAILS?: string }).CHECKIN_EMAILS;
  return !!email && !!raw?.split(/[,\s]+/).some((entry) => entry.toLowerCase() === email);
}

export async function ensureCheckinAccess(request: Request) {
  const session = await getSession(request);
  if (!session || !sessionCanCheckin(session)) throw new Error('Forbidden');
  return session;
}
