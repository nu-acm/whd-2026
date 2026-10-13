import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';

/**
 * Starts the Google OAuth redirect. Better Auth sends the user back to
 * /login, whose beforeLoad routes them to onboarding, the dashboard, or the
 * invite link they started from.
 */
export function GoogleButton({ redirect }: { redirect?: string }) {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginUrl = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login';

  const signIn = async () => {
    setError(null);
    setPending(true);
    try {
      const { error: signInError } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: loginUrl,
        errorCallbackURL: loginUrl,
      });
      if (signInError) {
        setError(t('login.googleFailed'));
        setPending(false);
      }
      // On success the browser is navigating away; keep the button disabled.
    } catch {
      setError(t('login.googleFailed'));
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={signIn}
        className="w-full"
      >
        <img src="/images/google.svg" alt="" aria-hidden className="h-5 w-5 shrink-0" />
        {pending ? t('common.loading') : t('login.google')}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
