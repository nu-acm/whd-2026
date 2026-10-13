import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, Mail } from 'lucide-react';
import { FaInstagram, FaTelegramPlane, FaTiktok } from 'react-icons/fa';
import { Footer2 } from '@/components/ui/footer-2';
import type { Session } from '@/lib/types';
import { SOCIAL_LINKS } from '@/lib/event';

const SOCIALS = [
  { href: SOCIAL_LINKS.instagram, labelKey: 'footer.instagram', icon: FaInstagram },
  { href: SOCIAL_LINKS.telegram, labelKey: 'footer.telegram', icon: FaTelegramPlane },
  { href: SOCIAL_LINKS.tiktok, labelKey: 'footer.tiktok', icon: FaTiktok },
  { href: SOCIAL_LINKS.email, labelKey: 'footer.email', icon: Mail },
] as const;
const SECTIONS = ['about', 'schedule', 'partners', 'benefits', 'gallery', 'faq'] as const;

export default function Footer({
  session,
  registrationOpen,
}: {
  session: Session;
  registrationOpen: boolean;
}) {
  const { t } = useTranslation();
  const isLoggedIn = !!session?.user;
  return (
    <footer id="registration" className="landing-container landing-footer">
      <Footer2
        logo={
          <a href="#top" className="footer-two-logo" aria-label="Women’s Hack Day">
            <img src="/whd/logo.webp" alt="" width={200} height={101} />
          </a>
        }
        tagline={registrationOpen ? t('footer.readyToJoin') : t('footer.registrationClosed')}
        socialText={t('footer.follow')}
        socialLinks={SOCIALS.map(({ href, labelKey, icon: Icon }) => ({
          href,
          label: t(labelKey),
          icon: <Icon aria-hidden="true" />,
        }))}
        linkGroups={[
          {
            title: t('footer.explore'),
            links: SECTIONS.map((key) => ({
              id: key,
              content: <a href={`#${key}`}>{t(`navbar.${key}`)}</a>,
            })),
          },
          {
            title: t('footer.documents'),
            links: [
              { id: 'privacy', content: <Link to="/privacy">{t('footer.privacy')}</Link> },
              { id: 'terms', content: <Link to="/terms">{t('footer.terms')}</Link> },
            ],
          },
        ]}
        copyright={t('footer.rights')}
        action={
          <Link to={isLoggedIn ? '/dashboard' : '/login'} className="landing-cta">
            {isLoggedIn
              ? t('footer.dashboard')
              : registrationOpen
                ? t('footer.register')
                : t('footer.signIn')}
            <ArrowUpRight size={20} aria-hidden="true" />
          </Link>
        }
      />
    </footer>
  );
}
