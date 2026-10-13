import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';
import { Cta4 } from '@/components/ui/cta-4';
import HeroMascot from '@/components/landing/HeroMascot';
import { NEXT_STEP_ROUTE, type NextStep } from '@/lib/next-step';
import type { RegistrationStatus } from '@/lib/registration';
import { parseTextWithLinks } from '@/lib/text';
import { MIN_TEAM_SIZE } from '@/db/schema';

export default function ClosingCTA({
  nextStep,
  registration,
}: {
  nextStep: NextStep;
  registration: RegistrationStatus;
}) {
  const { t } = useTranslation();
  const [isClosed, setIsClosed] = useState(!registration.open);
  const to = isClosed
    ? nextStep === 'onboarding'
      ? null
      : nextStep === 'register'
        ? '/login'
        : '/dashboard'
    : NEXT_STEP_ROUTE[nextStep];
  const label = isClosed ? (nextStep === 'register' ? 'signIn' : 'ready') : nextStep;
  const statusKey =
    isClosed && nextStep !== 'ready' ? `hero.closedStatus.${nextStep}` : `hero.status.${nextStep}`;
  return (
    <section
      id="join"
      className="landing-section landing-container"
      aria-labelledby="closing-cta-title"
    >
      <Cta4
        title={isClosed ? t('countdown.ended') : parseTextWithLinks(t('closingCta.title'))}
        subtitle={
          isClosed || nextStep !== 'register'
            ? t(statusKey, { min: MIN_TEAM_SIZE })
            : t('hero.tagline')
        }
        action={
          to && (
            <Link to={to} className="landing-cta">
              {t(`hero.cta.${label}`)}
              <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
          )
        }
        visual={
          <HeroMascot
            registration={registration}
            isClosed={isClosed}
            onElapsed={() => setIsClosed(true)}
            className="cta-four-mascot"
          />
        }
      />
    </section>
  );
}
