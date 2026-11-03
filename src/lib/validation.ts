import { z } from 'zod';
import { DOCUMENTS_POLICY_VERSION, REGISTRATION_POLICY_VERSION } from '@/lib/consent';
import { EVENT_DATE } from '@/lib/event';

/**
 * Women's Hack Day is open to school, college and university students.
 */
export const EDUCATION_LEVELS = [
  'School',
  'College',
  'Foundation',
  "Bachelor's",
  "Master's",
  'PhD',
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

/** Use the IIN's encoded birth date; an unusable date also requires a contact. */
export function requiresGuardianPhone(iin: string): boolean {
  if (!/^\d{12}$/.test(iin)) return false;

  const century = Number(iin[6]);
  if (century < 1 || century > 6) return true;

  const year = 1700 + Math.ceil(century / 2) * 100 + Number(iin.slice(0, 2));
  const month = Number(iin.slice(2, 4));
  const day = Number(iin.slice(4, 6));
  const birthDate = new Date(Date.UTC(year, month - 1, day));
  const eventDate = new Date(`${EVENT_DATE}T00:00:00Z`);
  if (
    birthDate.getUTCFullYear() !== year ||
    birthDate.getUTCMonth() !== month - 1 ||
    birthDate.getUTCDate() !== day ||
    birthDate > eventDate
  ) {
    return true;
  }

  let age = eventDate.getUTCFullYear() - year;
  if (
    eventDate.getUTCMonth() < month - 1 ||
    (eventDate.getUTCMonth() === month - 1 && eventDate.getUTCDate() < day)
  ) {
    age--;
  }
  return age < 18;
}

// Validation messages are i18n keys, resolved with t() in the UI.
const V = {
  emailRequired: 'validation.emailRequired',
  invalidEmail: 'validation.invalidEmail',
  codeMustBe6Digits: 'validation.codeMustBe6Digits',
  fullNameRequired: 'validation.fullNameRequired',
  fullNameMax: 'validation.fullNameMax',
  iinInvalid: 'validation.iinInvalid',
  phoneRequired: 'validation.phoneRequired',
  phoneInvalid: 'validation.phoneInvalid',
  educationInvalid: 'validation.educationInvalid',
  teamNameMin: 'validation.teamNameMin',
  teamNameMax: 'validation.teamNameMax',
  teamNameChars: 'validation.teamNameChars',
  inviteCodeRequired: 'validation.inviteCodeRequired',
  inviteCodeInvalid: 'validation.inviteCodeInvalid',
  cityRequired: 'validation.cityRequired',
  cityMax: 'validation.cityMax',
  placeOfStudyRequired: 'validation.placeOfStudyRequired',
  placeOfStudyMax: 'validation.placeOfStudyMax',
  parentPhoneInvalid: 'validation.parentPhoneInvalid',
  parentPhoneRequired: 'validation.parentPhoneRequired',
  consentRequired: 'validation.consentRequired',
  policyChanged: 'validation.policyChanged',
  documentsRequired: 'validation.documentsRequired',
  documentsChanged: 'validation.documentsChanged',
} as const;

// ── Login step 1: email ──────────────────────────────────────────────────────
export const emailSchema = z.object({
  email: z
    .string()
    .min(1, { error: V.emailRequired })
    .pipe(z.email({ error: V.invalidEmail })),
});
export type EmailInput = z.infer<typeof emailSchema>;

// ── Login step 2: one-time code ──────────────────────────────────────────────
export const otpSchema = z.object({
  otp: z
    .string()
    .length(6, { error: V.codeMustBe6Digits })
    .regex(/^\d{6}$/, { error: V.codeMustBe6Digits }),
});
export type OtpInput = z.infer<typeof otpSchema>;

function phoneSchema(error: string) {
  return z
    .string()
    .transform((value) => {
      const compact = value.replace(/[\s().-]/g, '');
      return compact.startsWith('+') ? compact : `+${compact}`;
    })
    .pipe(z.e164({ error }))
    .transform((value) => value.slice(1));
}

// ── Onboarding ───────────────────────────────────────────────────────────────
export const onboardingSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, { error: V.fullNameRequired })
      .max(100, { error: V.fullNameMax }),
    iin: z.string().regex(/^\d{12}$/, { error: V.iinInvalid }),
    phone: z.string().trim().min(1, { error: V.phoneRequired }).pipe(phoneSchema(V.phoneInvalid)),
    city: z.string().trim().min(1, { error: V.cityRequired }).max(100, { error: V.cityMax }),
    placeOfStudy: z
      .string()
      .trim()
      .min(1, { error: V.placeOfStudyRequired })
      .max(100, { error: V.placeOfStudyMax }),
    parentPhone: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || undefined)
      .pipe(phoneSchema(V.parentPhoneInvalid).optional()),
    educationLevel: z.enum(EDUCATION_LEVELS, { error: V.educationInvalid }),
    consent: z.literal(true, { error: V.consentRequired }),
    policyVersion: z.literal(REGISTRATION_POLICY_VERSION, { error: V.policyChanged }),
    documentsRead: z.literal(true, { error: V.documentsRequired }),
    documentsPolicyVersion: z.literal(DOCUMENTS_POLICY_VERSION, { error: V.documentsChanged }),
  })
  .refine((d) => !requiresGuardianPhone(d.iin) || !!d.parentPhone, {
    message: V.parentPhoneRequired,
    path: ['parentPhone'],
  });

export type OnboardingInput = z.infer<typeof onboardingSchema>;

// ── Teams ────────────────────────────────────────────────────────────────────
/** The Codeforces users file separates columns with "|" and users with line breaks. */
export const TEAM_NAME_FORBIDDEN = /[|\r\n]/;

export const createTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, { error: V.teamNameMin })
    .max(30, { error: V.teamNameMax })
    .refine((name) => !TEAM_NAME_FORBIDDEN.test(name), { error: V.teamNameChars }),
});
export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const inviteSlugSchema = z.object({
  slug: z
    .string()
    .min(1, { error: V.inviteCodeRequired })
    .max(50)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { error: V.inviteCodeInvalid }),
});
export type InviteSlugInput = z.infer<typeof inviteSlugSchema>;
