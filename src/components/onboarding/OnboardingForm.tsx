import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebHaptics } from 'web-haptics/react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import {
  EDUCATION_LEVELS,
  MINOR_EDUCATION_LEVELS,
  onboardingSchema,
  type EducationLevel,
  type OnboardingInput,
} from '@/lib/validation';
import { webHapticsOptions } from '@/lib/web-haptics';
import { REGISTRATION_CLOSED_I18N_KEY } from '@/lib/registration';

export type OnboardingDefaults = Partial<Record<keyof OnboardingInput, string>>;

type Errors = Partial<Record<keyof OnboardingInput | 'form', string>>;

export function OnboardingForm({
  defaults,
  onSubmit,
}: {
  defaults?: OnboardingDefaults;
  onSubmit: (values: OnboardingInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [values, setValues] = useState({
    fullName: defaults?.fullName ?? '',
    iin: defaults?.iin ?? '',
    phone: defaults?.phone ?? '',
    city: defaults?.city ?? '',
    placeOfStudy: defaults?.placeOfStudy ?? '',
    parentPhone: defaults?.parentPhone ?? '',
    educationLevel: (defaults?.educationLevel ?? '') as EducationLevel | '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const { trigger } = useWebHaptics(webHapticsOptions);

  const set = (key: keyof typeof values) => (v: string) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  // School students are usually minors, so we ask for a guardian's number.
  const needsParentPhone = MINOR_EDUCATION_LEVELS.includes(values.educationLevel as EducationLevel);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = onboardingSchema.safeParse(values);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof OnboardingInput;
        // Zod messages are i18n keys; resolve them for display.
        if (key && !next[key]) next[key] = t(issue.message);
      }
      trigger('error');
      setErrors(next);
      return;
    }

    setPending(true);
    try {
      await onSubmit(parsed.data);
      trigger('success');
    } catch (err) {
      trigger('error');
      // Server validation errors serialize their issues into Error.message.
      const next: Errors = {};
      if (err instanceof Error) {
        try {
          const issues: unknown = JSON.parse(err.message);
          if (Array.isArray(issues)) {
            for (const issue of issues) {
              const key = issue?.path?.[0];
              if (
                typeof key === 'string' &&
                Object.hasOwn(values, key) &&
                typeof issue.message === 'string' &&
                issue.message.startsWith('validation.') &&
                t(issue.message) !== issue.message
              ) {
                const field = key as keyof OnboardingInput;
                if (!next[field]) next[field] = t(issue.message);
              }
            }
          }
        } catch {
          // Plain errors can contain a translated registration status key.
        }
      }
      if (Object.keys(next).length === 0) {
        next.form =
          err instanceof Error && err.message === REGISTRATION_CLOSED_I18N_KEY
            ? t(err.message)
            : t('onboarding.saveFailed');
      }
      setErrors(next);
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <Field label={t('onboarding.fullName')} error={errors.fullName} required>
        {(p) => (
          <Input
            {...p}
            autoComplete="name"
            value={values.fullName}
            onChange={(e) => set('fullName')(e.target.value)}
            disabled={pending}
          />
        )}
      </Field>

      <Field label={t('onboarding.iin')} hint={t('onboarding.iinHint')} error={errors.iin} required>
        {(p) => (
          <Input
            {...p}
            inputMode="numeric"
            maxLength={12}
            value={values.iin}
            onChange={(e) => set('iin')(e.target.value.replace(/\D/g, '').slice(0, 12))}
            disabled={pending}
          />
        )}
      </Field>

      <Field label={t('onboarding.phone')} error={errors.phone} required>
        {(p) => (
          <Input
            {...p}
            type="tel"
            autoComplete="tel"
            placeholder="+7 700 000 00 00"
            value={values.phone}
            onChange={(e) => set('phone')(e.target.value)}
            disabled={pending}
          />
        )}
      </Field>

      <Field label={t('onboarding.educationLevel')} error={errors.educationLevel} required>
        {(p) => (
          <Select
            {...p}
            value={values.educationLevel}
            onChange={(e) => set('educationLevel')(e.target.value)}
            disabled={pending}
          >
            <option value="" disabled>
              —
            </option>
            {EDUCATION_LEVELS.map((level) => (
              <option key={level} value={level}>
                {t(`education.${level}`)}
              </option>
            ))}
          </Select>
        )}
      </Field>

      {needsParentPhone && (
        <Field
          label={t('onboarding.parentPhone')}
          hint={t('onboarding.parentPhoneHint')}
          error={errors.parentPhone}
          required
        >
          {(p) => (
            <Input
              {...p}
              type="tel"
              placeholder="+7 700 000 00 00"
              value={values.parentPhone}
              onChange={(e) => set('parentPhone')(e.target.value)}
              disabled={pending}
            />
          )}
        </Field>
      )}

      <Field label={t('onboarding.placeOfStudy')} error={errors.placeOfStudy} required>
        {(p) => (
          <Input
            {...p}
            value={values.placeOfStudy}
            onChange={(e) => set('placeOfStudy')(e.target.value)}
            disabled={pending}
          />
        )}
      </Field>

      <Field label={t('onboarding.city')} error={errors.city} required>
        {(p) => (
          <Input
            {...p}
            autoComplete="address-level2"
            value={values.city}
            onChange={(e) => set('city')(e.target.value)}
            disabled={pending}
          />
        )}
      </Field>

      {errors.form && (
        <p role="alert" className="text-sm text-red-400">
          {errors.form}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? t('common.loading') : t('onboarding.submit')}
      </Button>
    </form>
  );
}
