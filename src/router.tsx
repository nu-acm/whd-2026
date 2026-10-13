import { QueryClient } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
import { routeTree } from '@/routeTree.gen';
import { createI18n } from '@/i18n';

export function getRouter() {
  const i18n = createI18n();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000 },
    },
  });
  const router = createTanStackRouter({
    routeTree,
    context: { queryClient, i18n },
    Wrap: ({ children }) => <I18nextProvider i18n={i18n}>{children}</I18nextProvider>,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 60 * 1000,
  });
  setupRouterSsrQueryIntegration({ router, queryClient });
  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
