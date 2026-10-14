import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import type { AdminHeaderControls } from '@/lib/admin-header-context';

const navLinkClass =
  'inline-flex min-h-11 items-center rounded-lg px-3 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-foreground/10 hover:text-foreground';

/** Header shared by /admin and /checkin: navigation, refresh, sign out. */
export function AdminHeader({
  onSignOut,
  onRefresh,
  isRefreshing,
  refreshCooldownSeconds = 0,
}: AdminHeaderControls & { onSignOut: () => void }) {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-whd-pink/40 bg-whd-dark/90">
      <div className="mx-auto flex h-16 max-w-admin items-center justify-between gap-3 px-4 sm:px-8 lg:px-12">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Link
            to="/"
            className="flex min-h-11 shrink-0 items-center"
            aria-label="Women’s Hack Day"
          >
            <img
              src="/whd/logo.webp"
              alt=""
              aria-hidden="true"
              width={200}
              height={101}
              className="h-10 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            <Link to="/dashboard" className={navLinkClass}>
              {t('navbar.dashboard')}
            </Link>
            <Link
              to="/admin"
              className={navLinkClass}
              activeProps={{
                className: 'admin-nav-active',
              }}
            >
              {t('admin.navReport')}
            </Link>
            <Link
              to="/checkin"
              className={navLinkClass}
              activeProps={{
                className: 'admin-nav-active',
              }}
            >
              {t('admin.checkin')}
            </Link>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing || refreshCooldownSeconds > 0}
            >
              {isRefreshing
                ? t('admin.refreshing')
                : refreshCooldownSeconds > 0
                  ? t('admin.refreshIn', { seconds: refreshCooldownSeconds })
                  : t('admin.refresh')}
            </Button>
          )}
          <LanguageSwitcher />
          <ConfirmButton
            variant="ghost"
            label={t('common.signOut')}
            confirmLabel={t('common.confirm')}
            onConfirm={onSignOut}
            confirmationTone="accent"
          />
        </div>
      </div>
    </header>
  );
}
