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
import appCss from '@/styles.css?url';

/** The locale is read from a cookie so the server renders the right language. */
const getServerLocale = createServerFn({ method: 'GET' }).handler(async () => {
  const locale = getCookie('locale');
  return supportedLngs.find((lng) => lng === locale) ?? 'en';
});

function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="bg-whd-dark flex min-h-screen flex-col">
      <AuthHeader />
      <AuthCard title={t('notFound.title')} subtitle={t('notFound.message')}>
        <p className="text-whd-pink-bright mb-6 text-7xl font-black md:text-8xl">404</p>
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
    <div className="bg-whd-dark flex min-h-screen flex-col">
      <AuthHeader />
      <AuthCard title={t('errorPage.title')} subtitle={t('errorPage.message')}>
        {/* The raw message helps while developing; users never see internals. */}
        {import.meta.env.DEV && (
          <p className="mb-6 font-mono text-sm break-words text-red-400">
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
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=5.0' },
      { title: 'Women’s Hack Day' },
      {
        name: 'description',
        content:
          'Official website of Women’s Hack Day — an annual 3-round team competition in mathematics, competitive programming and product design, organized by the NU ACM-W Student Chapter.',
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'Women’s Hack Day' },
      { property: 'og:title', content: 'Women’s Hack Day' },
      {
        property: 'og:description',
        content: 'Join Women’s Hack Day — an empowering event for women in tech.',
      },
      { property: 'og:url', content: 'https://whd.nuacmw.kz' },
      { property: 'og:image', content: '/WHDlogo.svg' },
      { name: 'theme-color', content: '#0e0e13' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/WHDlogo.svg' },
      { rel: 'apple-touch-icon', href: '/logo192.png' },
      { rel: 'manifest', href: '/manifest.json' },
      { rel: 'canonical', href: 'https://whd.nuacmw.kz' },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  return (
    <html lang={i18n.language || 'en'}>
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
