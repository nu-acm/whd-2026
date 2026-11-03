import { useId, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { useWebHaptics } from 'web-haptics/react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { FormField } from '@/components/ui/form-field';
import { Checkbox } from '@/components/ui/checkbox';
import {
  EDUCATION_LEVELS,
  requiresGuardianPhone,
  onboardingSchema,
  type EducationLevel,
  type OnboardingInput,
} from '@/lib/validation';
import { webHapticsOptions } from '@/lib/web-haptics';
import { REGISTRATION_CLOSED_I18N_KEY } from '@/lib/registration';
import { DOCUMENTS_POLICY_VERSION, REGISTRATION_POLICY_VERSION } from '@/lib/consent';
import { CODE_OF_CONDUCT_URL, INSTRUCTIONS_AND_RULES_URL } from '@/lib/event';

export type OnboardingDefaults = Partial<
  Record<Exclude<keyof OnboardingInput, 'consent' | 'documentsRead'>, string>
> & { consent?: boolean; documentsRead?: boolean };

type Errors = Partial<Record<keyof OnboardingInput | 'form', string>>;

export function OnboardingForm({
  defaults,
  onSubmit,
}: {
  defaults?: OnboardingDefaults;
  onSubmit: (values: OnboardingInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const consentId = useId();
  const documentsId = useId();
  const [values, setValues] = useState({
    fullName: defaults?.fullName ?? '',
    iin: defaults?.iin ?? '',
    phone: defaults?.phone ?? '',
    city: defaults?.city ?? '',
    placeOfStudy: defaults?.placeOfStudy ?? '',
    parentPhone: defaults?.parentPhone ?? '',
    educationLevel: (defaults?.educationLevel ?? '') as EducationLevel | '',
    consent: defaults?.consent ?? false,
    policyVersion: REGISTRATION_POLICY_VERSION,
    documentsRead: defaults?.documentsRead ?? false,
    documentsPolicyVersion: DOCUMENTS_POLICY_VERSION,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const { trigger } = useWebHaptics(webHapticsOptions);

  const set =
    <K extends keyof typeof values>(key: K) =>
    (v: (typeof values)[K]) =>
      setValues((prev) => ({ ...prev, [key]: v }));

  const needsParentPhone = requiresGuardianPhone(values.iin);

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
      void trigger('error');
      setErrors(next);
      return;
    }

    setPending(true);
    try {
      await onSubmit(parsed.data);
      void trigger('success');
    } catch (err) {
      void trigger('error');
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
      <FieldGroup>
        <FormField
          disabled={pending}
          label={t('onboarding.fullName')}
          error={errors.fullName}
          required
        >
          {(p) => (
            <Input
              {...p}
              autoComplete="name"
              value={values.fullName}
              onChange={(e) => set('fullName')(e.target.value)}
              disabled={pending}
            />
          )}
        </FormField>

        <FormField
          disabled={pending}
          label={t('onboarding.iin')}
          hint={t('onboarding.iinHint')}
          error={errors.iin}
          required
        >
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
        </FormField>

        <FormField disabled={pending} label={t('onboarding.phone')} error={errors.phone} required>
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
        </FormField>

        <FormField
          disabled={pending}
          label={t('onboarding.educationLevel')}
          error={errors.educationLevel}
          required
        >
          {(p) => (
            <Select
              {...p}
              value={values.educationLevel}
              onChange={(e) => set('educationLevel')(e.target.value as EducationLevel | '')}
              disabled={pending}
            >
              <option value="" disabled>
                {t('onboarding.educationPlaceholder')}
              </option>
              {EDUCATION_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {t(`education.${level}`)}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        {needsParentPhone && (
          <FormField
            disabled={pending}
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
          </FormField>
        )}

        <FormField
          disabled={pending}
          label={t('onboarding.placeOfStudy')}
          error={errors.placeOfStudy}
          required
        >
          {(p) => (
            <Input
              {...p}
              value={values.placeOfStudy}
              onChange={(e) => set('placeOfStudy')(e.target.value)}
              disabled={pending}
            />
          )}
        </FormField>

        <FormField disabled={pending} label={t('onboarding.city')} error={errors.city} required>
          {(p) => (
            <Input
              {...p}
              autoComplete="address-level2"
              value={values.city}
              onChange={(e) => set('city')(e.target.value)}
              disabled={pending}
            />
          )}
        </FormField>

        <Field data-invalid={!!errors.consent} data-disabled={pending || undefined}>
          <div className="flex items-center gap-3">
            <Checkbox
              id={consentId}
              name="consent"
              checked={values.consent}
              onCheckedChange={set('consent')}
              disabled={pending}
              aria-required="true"
              aria-invalid={!!errors.consent}
              aria-describedby={`${consentId}-hint${errors.consent ? ` ${consentId}-error` : ''}`}
            />
            <FieldLabel htmlFor={consentId}>{t('onboarding.consent')}</FieldLabel>
          </div>
          <FieldDescription id={`${consentId}-hint`}>
            <Trans
              i18nKey="onboarding.consentHint"
              components={{
                privacy: <Link to="/privacy" target="_blank" rel="noopener" />,
                terms: <Link to="/terms" target="_blank" rel="noopener" />,
              }}
            />
          </FieldDescription>
          {errors.consent && <FieldError id={`${consentId}-error`}>{errors.consent}</FieldError>}
          {errors.policyVersion && <FieldError>{errors.policyVersion}</FieldError>}
        </Field>

        <Field data-invalid={!!errors.documentsRead} data-disabled={pending || undefined}>
          <div className="flex items-center gap-3">
            <Checkbox
              id={documentsId}
              name="documentsRead"
              checked={values.documentsRead}
              onCheckedChange={set('documentsRead')}
              disabled={pending}
              aria-required="true"
              aria-invalid={!!errors.documentsRead}
              aria-describedby={`${documentsId}-hint${errors.documentsRead ? ` ${documentsId}-error` : ''}`}
            />
            <FieldLabel htmlFor={documentsId}>{t('onboarding.documentsRead')}</FieldLabel>
          </div>
          <FieldDescription id={`${documentsId}-hint`}>
            <Trans
              i18nKey="onboarding.documentsHint"
              components={{
                conduct: <a href={CODE_OF_CONDUCT_URL} target="_blank" rel="noopener" />,
                rules: <a href={INSTRUCTIONS_AND_RULES_URL} target="_blank" rel="noopener" />,
              }}
            />
          </FieldDescription>
          {errors.documentsRead && (
            <FieldError id={`${documentsId}-error`}>{errors.documentsRead}</FieldError>
          )}
          {errors.documentsPolicyVersion && (
            <FieldError>{errors.documentsPolicyVersion}</FieldError>
          )}
        </Field>

        {errors.form && (
          <p role="alert" className="text-sm text-destructive">
            {errors.form}
          </p>
        )}

        <Button type="submit" disabled={pending} className="mt-1 w-full">
          {pending ? t('common.loading') : t('onboarding.submit')}
        </Button>
      </FieldGroup>
    </form>
  );
}
