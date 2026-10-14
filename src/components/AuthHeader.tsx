import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from '@tanstack/react-router';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { CircleHelp, MessageCircle } from 'lucide-react';
import { TELEGRAM_CHAT_URL } from '@/lib/event';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

/** Slim header for the signed-in pages: logo, language, who is signed in, sign out. */
export function AuthHeader({
  showSignOut = false,
  showHelp = false,
  email,
}: {
  showSignOut?: boolean;
  showHelp?: boolean;
  email?: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut();
    await navigate({ to: '/', reloadDocument: true });
  };

  return (
    <header className="auth-header sticky top-0 z-50 w-full border-b border-whd-pink/40 bg-whd-dark/90">
      <div
        className={cn(
          'auth-header-inner mx-auto flex h-16 max-w-account items-center justify-between px-4 sm:px-8 lg:px-12',
          showHelp && 'auth-header-with-help',
        )}
      >
        <Link to="/" className="flex min-h-11 items-center" aria-label="Women’s Hack Day">
          <img
            src="/whd/logo.webp"
            alt=""
            aria-hidden="true"
            width={200}
            height={101}
            className="h-11 w-auto"
          />
        </Link>

        {showHelp && (
          <nav className="auth-header-help" aria-label={t('faq.categories.contact')}>
            <Link to="/faq">
              <CircleHelp size={17} aria-hidden="true" />
              {t('faq.viewAll')}
            </Link>
            <a href={TELEGRAM_CHAT_URL} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={17} aria-hidden="true" />
              {t('faq.contactUs')}
            </a>
          </nav>
        )}
        <div className="auth-header-actions flex items-center gap-3">
          <LanguageSwitcher />
          {email && (
            <span className="auth-header-email hidden text-sm text-foreground/80 sm:inline">
              {email}
            </span>
          )}
          {showSignOut && (
            <ConfirmButton
              variant="ghost"
              label={t('common.signOut')}
              confirmLabel={t('common.confirm')}
              onConfirm={handleSignOut}
              confirmationTone="accent"
            />
          )}
        </div>
      </div>
    </header>
  );
}
