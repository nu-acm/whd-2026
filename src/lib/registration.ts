/** Client-safe registration constants (no `cloudflare:workers`, no env). */
export const REGISTRATION_CLOSED_I18N_KEY = 'onboarding.registrationClosedError' as const;

/** End of November 12 in Astana (UTC+5), two days before WHD 2026. */
export const DEFAULT_REGISTRATION_DEADLINE = '2026-11-12T23:59:59+05:00';

export type RegistrationStatus = {
  open: boolean;
  /** Effective ISO deadline, including the event default. */
  deadline: string | null;
};
