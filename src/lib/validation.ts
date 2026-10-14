import { z } from 'zod';

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

/** Levels where we ask for a parent/guardian phone number. */
export const MINOR_EDUCATION_LEVELS: readonly EducationLevel[] = ['School'];

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
  inviteCodeRequired: 'validation.inviteCodeRequired',
  inviteCodeInvalid: 'validation.inviteCodeInvalid',
  cityRequired: 'validation.cityRequired',
  cityMax: 'validation.cityMax',
  placeOfStudyRequired: 'validation.placeOfStudyRequired',
  placeOfStudyMax: 'validation.placeOfStudyMax',
  parentPhoneInvalid: 'validation.parentPhoneInvalid',
  parentPhoneRequired: 'validation.parentPhoneRequired',
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

const phoneRegex = /^\+?[\d][\d\s\-().]{5,24}$/;

/** Reduce a phone number to digits so stored values are comparable. */
function stripPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
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
    phone: z
      .string()
      .min(1, { error: V.phoneRequired })
      .regex(phoneRegex, { error: V.phoneInvalid })
      .transform(stripPhoneDigits)
      .pipe(z.string().min(6, { error: V.phoneInvalid }).max(25, { error: V.phoneInvalid })),
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
      .refine((v) => !v || (phoneRegex.test(v) && stripPhoneDigits(v).length >= 6), {
        message: V.parentPhoneInvalid,
      })
      .transform((v) => (v ? stripPhoneDigits(v) : undefined)),
    educationLevel: z.enum(EDUCATION_LEVELS, { error: V.educationInvalid }),
  })
  // School students are usually minors, so a guardian contact is required.
  .refine((d) => !MINOR_EDUCATION_LEVELS.includes(d.educationLevel) || !!d.parentPhone, {
    message: V.parentPhoneRequired,
    path: ['parentPhone'],
  });

export type OnboardingInput = z.infer<typeof onboardingSchema>;

// ── Teams ────────────────────────────────────────────────────────────────────
export const createTeamSchema = z.object({
  name: z.string().trim().min(3, { error: V.teamNameMin }).max(30, { error: V.teamNameMax }),
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
