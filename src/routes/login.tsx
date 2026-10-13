import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { AccountShell } from '@/components/AccountShell';
import { LoginVisual } from '@/components/login/LoginVisual';
import { AuthCard } from '@/components/ui/auth-card';
import { EmailForm } from '@/components/login/EmailForm';
import { OtpForm } from '@/components/login/OtpForm';
import { GoogleButton } from '@/components/login/GoogleButton';
import { getDemoLogin, getSession, isGoogleSignInEnabled } from '@/lib/auth.server';
import { isRegistrationOpen } from '@/lib/registration.server';
import { Notice } from '@/components/ui/notice';
import { getParticipant } from '@/lib/onboarding.server';
import { safeInviteRedirect, validateRedirectSearch } from '@/lib/redirect';

/**
 * Where a signed-in visitor belongs: onboarding until they have a profile,
 * the dashboard afterwards. Used both to bounce people away from /login and
 * to route them after a successful verification.
 */
const getPostLoginDestination = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getSession(getRequest());
  if (!session?.user) return null;
  const profile = await getParticipant(session.user.id);
  return profile ? '/dashboard' : '/onboarding';
});

const getLoginOptions = createServerFn({ method: 'GET' }).handler(() => ({
  googleEnabled: isGoogleSignInEnabled(),
  registrationOpen: isRegistrationOpen(),
  demo: getDemoLogin(),
}));

export const Route = createFileRoute('/login')({
  // `?redirect=/invite/…` survives sign-in, so an invite link opened while
  // signed out still ends on that invite (via onboarding if needed).
  validateSearch: validateRedirectSearch,
  beforeLoad: async ({ search }) => {
    const destination = await getPostLoginDestination();
    if (destination === '/onboarding') throw redirect({ to: '/onboarding', search });
    // Re-checked here as well as in validateSearch: this is where we navigate.
    if (destination) throw redirect({ to: safeInviteRedirect(search.redirect) ?? destination });
  },
  loader: () => getLoginOptions(),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { googleEnabled, registrationOpen, demo } = Route.useLoaderData();
  const search = Route.useSearch();
  const [email, setEmail] = useState<string | null>(null);
  const isDemo = !!demo && email?.trim().toLowerCase() === demo.email;

  const handleVerified = async () => {
    const destination = (await getPostLoginDestination()) ?? '/onboarding';
    if (destination === '/onboarding') navigate({ to: '/onboarding', search });
    else navigate({ to: safeInviteRedirect(search.redirect) ?? destination });
  };

  return (
    <AccountShell>
      {email === null ? (
        <AuthCard
          title={t('login.title')}
          contentKey="email"
          subtitle={t('login.subtitle')}
          illustration={<LoginVisual />}
        >
          {!registrationOpen && <Notice className="mb-5">{t('login.registrationClosed')}</Notice>}
          {googleEnabled && (
            <>
              <GoogleButton redirect={search.redirect} />
              <div className="account-form-divider">
                <span className="bg-whd-border h-px flex-1" />
                <span className="text-whd-text-muted text-sm">{t('login.or')}</span>
                <span className="bg-whd-border h-px flex-1" />
              </div>
            </>
          )}
          <EmailForm onSent={setEmail} />
          {demo && <DemoHint label={t('login.demoAccount')} value={demo.email} />}
        </AuthCard>
      ) : (
        <AuthCard
          title={t('login.otpTitle')}
          contentKey="otp"
          subtitle={t('login.otpSubtitle', { email })}
          illustration={<LoginVisual />}
        >
          {isDemo && <DemoHint label={t('login.demoCode')} value={demo.code} mono />}
          <OtpForm email={email} onVerified={handleVerified} onChangeEmail={() => setEmail(null)} />
        </AuthCard>
      )}
    </AccountShell>
  );
}

/** TEMPORARY: shows the demo admin login (see getDemoLogin). */
function DemoHint({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border-whd-pink/60 bg-whd-pink/10 mb-5 rounded-xl border border-dashed px-4 py-3 text-sm last:mt-5 last:mb-0">
      <span className="text-whd-text-muted">{label} </span>
      <span
        className={mono ? 'font-mono text-lg tracking-[0.3em] text-white' : 'text-white select-all'}
      >
        {value}
      </span>
    </div>
  );
}
