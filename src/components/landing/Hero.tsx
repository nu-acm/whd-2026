import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { NEXT_STEP_ROUTE, type NextStep } from '@/lib/next-step';
import { MIN_TEAM_SIZE } from '@/db/schema';
import HeroMascot from '@/components/landing/HeroMascot';
import type { RegistrationStatus } from '@/lib/registration';

type Cta = { to: (typeof NEXT_STEP_ROUTE)[NextStep]; label: string } | null;

/**
 * After the deadline nobody can sign up, but people who did register still
 * need a way back to their team. A visitor without a profile has nowhere to go.
 */
function closedCta(nextStep: NextStep, t: (key: string) => string): Cta {
  if (nextStep === 'register') return { to: '/login', label: t('hero.cta.signIn') };
  if (nextStep === 'onboarding') return null;
  return { to: '/dashboard', label: t('hero.cta.ready') };
}

export default function Hero({
  nextStep,
  registration,
}: {
  nextStep: NextStep;
  registration: RegistrationStatus;
}) {
  const { t } = useTranslation();
  // Flips without a reload when the countdown reaches zero on an open page.
  const [isClosed, setIsClosed] = useState(!registration.open);

  const cta: Cta = isClosed
    ? closedCta(nextStep, t)
    : { to: NEXT_STEP_ROUTE[nextStep], label: t(`hero.cta.${nextStep}`) };
  const statusKey =
    isClosed && nextStep !== 'ready' ? `hero.closedStatus.${nextStep}` : `hero.status.${nextStep}`;
  const showStatus = isClosed || nextStep !== 'register';

  return (
    <section id="top" className="landing-hero">
      <div className="hero-copy">
        <h1 className="hero-title">
          <img
            src="/whd/hero-wordmark.png"
            alt="Women’s Hack Day!"
            width={1996}
            height={1029}
            fetchPriority="high"
          />
        </h1>
        <p className="sr-only">{t('hero.tagline')}</p>
        <div className="hero-action">
          {cta && (
            <Link to={cta.to} className="landing-cta hero-spy-cta">
              <span className="hero-cta-text-slot">
                <span className="hero-cta-label">{cta.label}</span>
              </span>
              <span className="hero-cta-icon-slot" aria-hidden="true">
                <span className="hero-cta-arrow">↗</span>
              </span>
            </Link>
          )}
          {isClosed && (
            <p role="status" className="registration-status">
              {t('countdown.ended')}
            </p>
          )}
          {showStatus && <p className="hero-status">{t(statusKey, { min: MIN_TEAM_SIZE })}</p>}
        </div>
      </div>
      <HeroMascot
        registration={registration}
        isClosed={isClosed}
        onElapsed={() => setIsClosed(true)}
        priority
      />
    </section>
  );
}
