import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebHaptics } from 'web-haptics/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
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
      trigger('error');
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
        trigger('error');
        setError(t('login.verifyFailed'));
        return;
      }
      trigger('success');
      onVerified();
    } catch {
      trigger('error');
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
      <Field label={t('login.otpTitle')} error={error ?? undefined} required>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            placeholder="000000"
            className="text-center text-2xl tracking-[0.5em]"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            disabled={pending}
          />
        )}
      </Field>

      <Button type="submit" disabled={pending || otp.length !== 6} className="w-full">
        {pending ? t('common.loading') : t('login.verify')}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onChangeEmail}
          className="text-whd-text-muted hover:text-whd-pink-bright cursor-pointer transition-colors"
        >
          {t('login.changeEmail')}
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={cooldown > 0 || resending || pending}
          className="text-whd-pink-soft hover:text-whd-pink-bright disabled:text-whd-text-dim cursor-pointer transition-colors disabled:cursor-not-allowed"
        >
          {cooldown > 0 ? t('login.resendIn', { seconds: cooldown }) : t('login.resend')}
        </button>
      </div>
    </form>
  );
}
