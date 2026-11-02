import { env } from 'cloudflare:workers';

interface AppEnv {
  ADMIN_EMAILS?: string;
}

/** Emails allowed into /admin and /checkin, from the ADMIN_EMAILS secret. */
function getAdminEmails(): string[] {
  const raw = (env as unknown as AppEnv).ADMIN_EMAILS?.trim();
  if (!raw) return [];
  return raw
    .split(/[,\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** True only when ADMIN_EMAILS is non-empty and lists this session's email. */
export function sessionIsAdmin(session: { user: { email?: string | null } } | null): boolean {
  if (!session?.user?.email) return false;
  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0) return false;
  return adminEmails.includes(session.user.email.toLowerCase());
}
