import { ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebHaptics } from 'web-haptics/react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldGroup } from '@/components/ui/field';
import { FormField } from '@/components/ui/form-field';
import { sendSignInCode } from '@/lib/auth-client';
import { emailSchema } from '@/lib/validation';
import { webHapticsOptions } from '@/lib/web-haptics';

export function EmailForm({ onSent }: { onSent: (email: string) => void }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { trigger } = useWebHaptics(webHapticsOptions);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = emailSchema.safeParse({ email });
    if (!parsed.success) {
      // Zod messages are i18n keys, resolved here.
      void trigger('error');
      setError(t(parsed.error.issues[0].message));
      return;
    }

    setPending(true);
    try {
      await sendSignInCode(parsed.data.email);
      void trigger('success');
      onSent(parsed.data.email);
    } catch {
      void trigger('error');
      setError(t('login.sendFailed'));
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <FieldGroup>
        <FormField
          disabled={pending}
          label={t('login.emailLabel')}
          error={error ?? undefined}
          required
        >
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              autoFocus
              placeholder={t('login.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
            />
          )}
        </FormField>

        <Button type="submit" disabled={pending} className="w-full">
          <>
            {pending && <Spinner data-icon="inline-start" />}
            <span>{pending ? t('common.loading') : t('login.sendCode')}</span>
          </>
          <ArrowUpRight className="account-button-arrow" aria-hidden="true" />
        </Button>
      </FieldGroup>
    </form>
  );
}
