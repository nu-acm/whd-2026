import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import type { Session } from '@/lib/types';

const NAV_LINKS = [
  { href: '#about', labelKey: 'navbar.about' },
  { href: '#schedule', labelKey: 'navbar.schedule' },
  { href: '#partners', labelKey: 'navbar.partners' },
  { href: '#benefits', labelKey: 'navbar.benefits' },
  { href: '#gallery', labelKey: 'navbar.gallery' },
  { href: '#faq', labelKey: 'navbar.faq' },
] as const;

export default function Navbar({
  session,
  registrationOpen,
}: {
  session: Session;
  registrationOpen: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const ctaTo = session?.user ? '/dashboard' : '/login';
  const ctaLabel = session?.user
    ? t('navbar.dashboard')
    : registrationOpen
      ? t('navbar.register')
      : t('navbar.signIn');
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open]);
  return (
    <header className="landing-nav">
      <div className="nav-bar">
        <a
          href="#top"
          className="nav-logo"
          aria-label="Women’s Hack Day"
          onClick={() => setOpen(false)}
        >
          <img src="/whd/logo.webp" alt="" width={200} height={101} />
        </a>
        <nav className="desktop-nav" aria-label={t('navbar.navigation')}>
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {t(link.labelKey)}
            </a>
          ))}
        </nav>
        <div className="nav-actions">
          <LanguageSwitcher />
          <Link to={ctaTo} className="nav-cta">
            {ctaLabel}
          </Link>
        </div>
        <button
          ref={toggle}
          className="menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={t('navbar.toggleMenu')}
          onClick={() => setOpen(!open)}
        >
          <span aria-hidden="true">{open ? '×' : '☰'}</span>
        </button>
      </div>
      <nav
        id="mobile-navigation"
        className="mobile-nav"
        hidden={!open}
        aria-label={t('navbar.navigation')}
      >
        {NAV_LINKS.map((link) => (
          <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
            {t(link.labelKey)}
          </a>
        ))}
        <LanguageSwitcher size="md" onLanguageChange={() => setOpen(false)} />
        <Link to={ctaTo} className="landing-cta" onClick={() => setOpen(false)}>
          {ctaLabel}
          <span aria-hidden="true">↗</span>
        </Link>
      </nav>
    </header>
  );
}
