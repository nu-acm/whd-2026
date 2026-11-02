import { env } from 'cloudflare:workers';

interface AppEnv {
  ADMIN_EMAILS?: string;
  ADDITIONAL_ADMIN_EMAILS?: string;
}

/** Additional organiser grants preserve the existing ADMIN_EMAILS allowlist. */
function getAdminEmails(): string[] {
  const { ADMIN_EMAILS, ADDITIONAL_ADMIN_EMAILS } = env as unknown as AppEnv;
  const raw = [ADMIN_EMAILS, ADDITIONAL_ADMIN_EMAILS].filter(Boolean).join(',').trim();
  if (!raw) return [];
  return raw
    .split(/[,\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** True only when a configured allowlist includes this session's email. */
export function sessionIsAdmin(session: { user: { email?: string | null } } | null): boolean {
  if (!session?.user?.email) return false;
  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0) return false;
  return adminEmails.includes(session.user.email.toLowerCase());
}
