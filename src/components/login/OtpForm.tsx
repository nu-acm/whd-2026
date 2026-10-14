import { ArrowUpRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebHaptics } from 'web-haptics/react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import InputOtp7 from '@/components/watermelon/input-otp-7';
import { FieldGroup } from '@/components/ui/field';
import { FormField } from '@/components/ui/form-field';
import { authClient, sendSignInCode } from '@/lib/auth-client';
import { otpSchema } from '@/lib/validation';
import { webHapticsOptions } from '@/lib/web-haptics';

const RESEND_COOLDOWN_SECONDS = 30;

export function OtpForm({
  email,
  onVerified,
  onChangeEmail,
}: {
  email: string;
  onVerified: () => void;
  onChangeEmail: () => void;
}) {
  const { t } = useTranslation();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const { trigger } = useWebHaptics(webHapticsOptions);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = otpSchema.safeParse({ otp });
    if (!parsed.success) {
      void trigger('error');
      setError(t(parsed.error.issues[0].message));
      return;
    }

    setPending(true);
    try {
      const { error: verifyError } = await authClient.signIn.emailOtp({
        email,
        otp: parsed.data.otp,
      });
      if (verifyError) {
        void trigger('error');
        setError(t('login.verifyFailed'));
        return;
      }
      void trigger('success');
      onVerified();
    } catch {
      void trigger('error');
      setError(t('login.verifyFailed'));
    } finally {
      setPending(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0 || resending || pending) return;
    setError(null);
    setResending(true);
    try {
      await sendSignInCode(email);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError(t('login.sendFailed'));
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <FieldGroup>
        <FormField
          disabled={pending}
          label={t('login.otpTitle')}
          error={error ?? undefined}
          required
        >
          {(fieldProps) => (
            <InputOtp7
              {...fieldProps}
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={otp}
              onChange={setOtp}
              disabled={pending}
            />
          )}
        </FormField>

        <Button type="submit" disabled={pending || otp.length !== 6} className="w-full">
          <>
            {pending && <Spinner data-icon="inline-start" />}
            <span>{pending ? t('common.loading') : t('login.verify')}</span>
          </>
          <ArrowUpRight className="account-button-arrow" aria-hidden="true" />
        </Button>

        <div className="account-otp-actions flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={onChangeEmail}
            className="cursor-pointer text-whd-text-muted transition-colors hover:text-whd-pink-bright"
          >
            {t('login.changeEmail')}
          </button>
          <button
            type="button"
            onClick={resend}
            disabled={cooldown > 0 || resending || pending}
            className="cursor-pointer text-whd-pink-soft transition-colors hover:text-whd-pink-bright disabled:cursor-not-allowed disabled:text-whd-text-dim"
          >
            {cooldown > 0 ? t('login.resendIn', { seconds: cooldown }) : t('login.resend')}
          </button>
        </div>
      </FieldGroup>
    </form>
  );
}
