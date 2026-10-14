import { useTranslation } from 'react-i18next';

/** Freedom Broker wordmark: the shield + FREEDOM lockup with BROKER set beneath. */
function FreedomBrokerLogo({ alt }: { alt: string }) {
  return (
    <div role="img" aria-label={alt} className="freedom-broker-logo">
      <img
        src="/whd/sponsor-freedom.svg"
        alt=""
        width={572.663}
        height={172.142}
        className="absolute inset-0 h-full w-full"
      />
      <img
        src="/whd/sponsor-freedom-broker.svg"
        alt=""
        width={227.821}
        height={42.597}
        className="freedom-broker-wordmark"
      />
    </div>
  );
}

export default function Partners() {
  const { t } = useTranslation();

  return (
    <section id="partners" className="bento-sponsors" aria-labelledby="partners-title">
      <h3 id="partners-title">{t('partners.title')}</h3>
      <div className="partner-logos">
        <div>
          <FreedomBrokerLogo alt={t('partners.generalSponsorAlt')} />
        </div>
        <img
          src="/whd/sponsor-nu-impact.webp"
          alt={t('partners.nuImpactAlt')}
          width={1440}
          height={522}
          loading="lazy"
        />
      </div>
    </section>
  );
}
