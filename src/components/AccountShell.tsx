import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { AuthHeader } from '@/components/AuthHeader';

/** WHD account surfaces share the landing's palette without changing other app routes. */
export function AccountShell({
  children,
  email,
  showHelp = false,
}: {
  children: ReactNode;
  email?: string;
  showHelp?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="account-page">
      <AuthHeader showSignOut={!!email} email={email} showHelp={showHelp} />
      {children}
      <footer className="account-footer">
        <p>{t('footer.rights')}</p>
        <nav aria-label={t('footer.documents')}>
          <Link to="/faq">{t('navbar.faq')}</Link>
          <Link to="/privacy">{t('footer.privacy')}</Link>
          <Link to="/terms">{t('footer.terms')}</Link>
        </nav>
      </footer>
    </div>
  );
}
