import { env } from 'cloudflare:workers';

import {
  DEFAULT_REGISTRATION_DEADLINE,
  REGISTRATION_CLOSED_I18N_KEY,
  type RegistrationStatus,
} from './registration';

export { REGISTRATION_CLOSED_I18N_KEY };

interface AppEnv {
  REGISTRATION_DEADLINE?: string;
}

/** An explicit environment override takes precedence over the event deadline. */
function getRegistrationDeadline(): Date {
  const raw = (env as unknown as AppEnv).REGISTRATION_DEADLINE?.trim();
  if (!raw) return new Date(DEFAULT_REGISTRATION_DEADLINE);
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    console.warn('[registration] REGISTRATION_DEADLINE is unparseable; using the event deadline.', {
      raw,
    });
    return new Date(DEFAULT_REGISTRATION_DEADLINE);
  }
  return d;
}

/** Use the same deadline for the UI and server-side registration checks. */
export function isRegistrationOpen(): boolean {
  const deadline = getRegistrationDeadline();
  return Date.now() < deadline.getTime();
}

/** What the UI needs: whether sign-ups are open, and the deadline for the countdown. */
export function getRegistrationStatus(): RegistrationStatus {
  return { open: isRegistrationOpen(), deadline: getRegistrationDeadline().toISOString() };
}
