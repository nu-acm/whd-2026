import { useTranslation } from 'react-i18next';
import { Coffee, Gift, Shirt, Trophy } from 'lucide-react';
import Bento2 from '@/components/watermelon/bento-02';
import Partners from '@/components/landing/Partners';

export default function Benefits() {
  const { t } = useTranslation();
  return (
    <section
      id="benefits"
      className="landing-section landing-container benefits-bento"
      aria-labelledby="benefits-title"
    >
      <h2 id="benefits-title" className="landing-heading">
        {t('benefits.title')}
      </h2>
      <Bento2
        prize={
          <>
            <Trophy className="bento-trophy" aria-hidden="true" strokeWidth={1.5} />
            <div>
              <h3 className="bento-prize-label">{t('about.prizePool')}</h3>
              <p className="bento-prize-amount">
                {t('about.prizeAmount')} <span>{t('about.prizeUnit')}</span>
              </p>
            </div>
          </>
        }
        welcome={
          <>
            <Gift className="bento-gift" aria-hidden="true" strokeWidth={1.25} />
            <h3>{t('benefits.welcomePackage')}</h3>
          </>
        }
        experience={
          <ul className="bento-extras">
            <li>
              <Shirt aria-hidden="true" strokeWidth={1.5} />
              <h3>{t('benefits.merchandise')}</h3>
            </li>
            <li>
              <Coffee aria-hidden="true" strokeWidth={1.5} />
              <h3>{t('benefits.coffeeBreak')}</h3>
            </li>
          </ul>
        }
        partners={<Partners />}
      />
    </section>
  );
}
