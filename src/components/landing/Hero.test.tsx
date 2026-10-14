// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vite-plus/test';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import Hero from './Hero';
import { renderWithI18n } from '@/test/render';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('avoids loading account routes on repeated hover or focus but loads them on click', async () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const checkAccess = vi.fn();
  const loadDashboard = vi.fn();
  const root = createRootRoute({ component: Outlet });
  const landing = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => <Hero nextStep="team" registration={{ open: true, deadline: null }} />,
  });
  const dashboard = createRoute({
    getParentRoute: () => root,
    path: '/dashboard',
    beforeLoad: checkAccess,
    loader: loadDashboard,
    component: () => <p>Team dashboard</p>,
  });
  const router = createRouter({
    routeTree: root.addChildren([landing, dashboard]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 60_000,
  });
  await router.load();
  const { i18n } = renderWithI18n(<RouterProvider router={router} />);
  const user = userEvent.setup();
  const cta = await screen.findByRole('link', { name: i18n.t('hero.cta.team') });
  for (let index = 0; index < 3; index++) {
    await user.hover(cta);
    await user.unhover(cta);
  }
  await user.tab();
  expect(document.activeElement).toBe(cta);
  expect(checkAccess).not.toHaveBeenCalled();
  expect(loadDashboard).not.toHaveBeenCalled();

  await user.click(cta);
  await screen.findByText('Team dashboard');
  expect(checkAccess).toHaveBeenCalledOnce();
  expect(loadDashboard).toHaveBeenCalledOnce();
});
