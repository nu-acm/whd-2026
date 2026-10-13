import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { AuthHeader } from '@/components/AuthHeader';
import FAQ from '@/components/landing/FAQ';

export const Route = createFileRoute('/faq')({
  component: FAQPage,
  head: ({ match }) => ({
    meta: [{ title: `${match.context.i18n.t('faq.allTitle')} — Women’s Hack Day` }],
  }),
});

function FAQPage() {
  const { t } = useTranslation();
  return (
    <div className="landing-page faq-page">
      <AuthHeader />
      <main>
        <div className="landing-container faq-page-back">
          <Link to="/" hash="faq">
            <ArrowLeft size={18} aria-hidden="true" />
            {t('faq.backToHome')}
          </Link>
        </div>
        <FAQ full />
      </main>
      <footer className="landing-container faq-page-footer">
        <p>{t('footer.rights')}</p>
        <div>
          <Link to="/privacy">{t('footer.privacy')}</Link>
          <Link to="/terms">{t('footer.terms')}</Link>
        </div>
      </footer>
    </div>
  );
}
