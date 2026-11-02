import type { QueryClient } from '@tanstack/react-query';
import type { i18n } from 'i18next';
import {
  HeadContent,
  Link,
  Scripts,
  createRootRouteWithContext,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getCookie } from '@tanstack/react-start/server';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { useTranslation } from 'react-i18next';

import { AuthHeader } from '@/components/AuthHeader';
import { AuthCard } from '@/components/ui/auth-card';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { supportedLngs } from '@/i18n';
import { pageMetadata, SITE_URL } from '@/lib/metadata';
import appCss from '@/styles.css?url';

/** The locale is read from a cookie so the server renders the right language. */
const getServerLocale = createServerFn({ method: 'GET' }).handler(async () => {
  const locale = getCookie('locale');
  return supportedLngs.find((lng) => lng === locale) ?? 'en';
});

function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col bg-whd-dark">
      <AuthHeader />
      <AuthCard title={t('notFound.title')} subtitle={t('notFound.message')}>
        <p className="mb-6 text-7xl font-black text-whd-pink-bright md:text-8xl">404</p>
        <Link to="/" className={buttonVariants({ className: 'w-full' })}>
          {t('notFound.goHome')}
        </Link>
      </AuthCard>
    </div>
  );
}

function RootErrorPage({ error, reset }: ErrorComponentProps) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col bg-whd-dark">
      <AuthHeader />
      <AuthCard title={t('errorPage.title')} subtitle={t('errorPage.message')}>
        {/* The raw message helps while developing; users never see internals. */}
        {import.meta.env.DEV && (
          <p className="mb-6 font-mono text-sm wrap-break-word text-destructive">
            {error instanceof Error ? error.message : String(error)}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" className="flex-1" onClick={() => reset()}>
            {t('errorPage.retry')}
          </Button>
          <Link to="/" className={buttonVariants({ className: 'flex-1' })}>
            {t('notFound.goHome')}
          </Link>
        </div>
      </AuthCard>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient; i18n: i18n }>()({
  notFoundComponent: NotFoundPage,
  errorComponent: RootErrorPage,
  beforeLoad: async ({ context }) => {
    const locale = await getServerLocale();
    if (context.i18n.language !== locale) {
      await context.i18n.changeLanguage(locale);
    }
  },
  head: ({ match, matches }) => {
    const { i18n } = match.context;
    const canonicalUrl = new URL(matches.at(-1)?.pathname ?? '/', SITE_URL).href;
    const imageUrl = `${SITE_URL}/social-preview.png`;
    const ogLocale = i18n.language === 'kk' ? 'kk_KZ' : i18n.language === 'ru' ? 'ru_RU' : 'en_US';
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=5.0' },
        ...pageMetadata(i18n.t('metadata.title'), i18n.t('metadata.description')),
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Women’s Hack Day' },
        { property: 'og:url', content: canonicalUrl },
        { property: 'og:locale', content: ogLocale },
        { property: 'og:image', content: imageUrl },
        { property: 'og:image:type', content: 'image/png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: i18n.t('metadata.imageAlt') },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: imageUrl },
        { name: 'twitter:image:alt', content: i18n.t('metadata.imageAlt') },
        { name: 'theme-color', content: '#0e0e13' },
      ],
      links: [
        { rel: 'stylesheet', href: appCss },
        { rel: 'icon', type: 'image/x-icon', sizes: '16x16 32x32 48x48', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/svg+xml', sizes: 'any', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'canonical', href: canonicalUrl },
      ],
    };
  },
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  return (
    <html lang={i18n.language || 'en'} className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{ position: 'middle-right', hideUntilHover: true }}
            plugins={[{ name: 'TanStack Router', render: <TanStackRouterDevtoolsPanel /> }]}
          />
        )}
        <Scripts />
      </body>
    </html>
  );
}
