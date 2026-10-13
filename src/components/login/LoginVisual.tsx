import { CalendarDays, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function LoginVisual() {
  const { t } = useTranslation();
  return (
    <aside className="login-visual" aria-label="Women’s Hack Day 2026">
      <img
        className="login-wordmark"
        src="/whd/hero-wordmark.png"
        alt="Women’s Hack Day!"
        width={2000}
        height={1038}
      />
      <div className="login-visual-copy">
        <p>{t('login.welcome')}</p>
        <span>{t('login.welcomeHint')}</span>
      </div>
      <img className="login-mascot" src="/whd/mascot-faq.webp" alt="" width={499} height={528} />
      <div className="login-event">
        <span>
          <CalendarDays aria-hidden="true" />
          {t('timeline.items.event')}
        </span>
        <span>
          <MapPin aria-hidden="true" />
          {t('infoCards.whereAnswer')}
        </span>
      </div>
    </aside>
  );
}
