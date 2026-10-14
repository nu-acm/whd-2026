import { useTranslation } from 'react-i18next';
import Countdown from '@/components/landing/Countdown';
import type { RegistrationStatus } from '@/lib/registration';
import { cn } from '@/lib/utils';

export default function HeroMascot({
  registration,
  isClosed,
  onElapsed,
  priority = false,
  className = '',
}: {
  registration: RegistrationStatus;
  isClosed: boolean;
  onElapsed: () => void;
  priority?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className={cn('hero-visual', className)}>
      <img
        src="/whd/mascot-hero.svg"
        alt={t('hero.imageAlt')}
        width={5221}
        height={6327}
        fetchPriority={priority ? 'high' : undefined}
        loading={priority ? 'eager' : 'lazy'}
      />
      <div className="hero-gadget">
        {!isClosed && registration.deadline ? (
          <Countdown deadline={registration.deadline} onElapsed={onElapsed} />
        ) : (
          <div className="hero-gadget-message">
            <p>{isClosed ? t('countdown.ended') : t('hero.registrationOpen')}</p>
            <strong>{t('infoCards.whenAnswer')}</strong>
            <span>2026 / {t('infoCards.whereDetail')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
