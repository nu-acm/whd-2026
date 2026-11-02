/** Client-safe pieces of a team's contest identity (see contest.server.ts). */

/** Proctoring's team-code alphabet, without 0/O/1/I/L: the password is also the upload code. */
export const CONTEST_PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CONTEST_PASSWORD_LENGTH = 6;

/** The table number as staff and logins write it: 7 → "07", 123 → "123". */
export function formatTeamNumber(number: number): string {
  return String(number).padStart(2, '0');
}

/** Sorts numbered teams first, in order, and teams without a number last. */
export function compareTeamNumbers(a: number | null, b: number | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

/** What a finalized team sees on its dashboard, for good. */
export type ContestAccess = {
  tableNumber: string;
  login: string;
  password: string;
  /** The proctoring upload page, with the password in the fragment so no server logs it. */
  uploadUrl: string;
  /** ISO instant from which the upload button shows; null hides it. */
  contestStart: string | null;
};

export const CONTEST_ERRORS = {
  registrationOpen: 'admin.finalizeRegistrationOpen',
  badNames: 'admin.finalizeBadNames',
} as const;
