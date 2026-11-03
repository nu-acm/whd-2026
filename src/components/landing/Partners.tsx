import { useTranslation } from 'react-i18next';

export default function Partners() {
  const { t } = useTranslation();

  return (
    <section id="partners" className="bento-sponsors" aria-labelledby="partners-title">
      <h3 id="partners-title">{t('partners.title')}</h3>
      <div className="partner-logos">
        <img
          src="/whd/sponsor-freedom.svg"
          alt={t('partners.generalSponsorAlt')}
          width={1500}
          height={336.2}
          loading="lazy"
        />
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
