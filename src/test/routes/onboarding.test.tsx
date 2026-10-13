// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { renderWithI18n } from '@/test/render';
import type { OnboardingInput } from '@/lib/validation';

const { getParticipant, upsertParticipant } = vi.hoisted(() => ({
  getParticipant: vi.fn(),
  upsertParticipant: vi.fn(),
}));
vi.mock('@/lib/onboarding.server', () => ({ getParticipant, upsertParticipant }));
vi.mock('@/lib/auth.server', () => ({
  getSession: async () => ({ user: { id: 'qa' } }),
  ensureSession: async () => ({ user: { id: 'qa' } }),
}));
vi.mock('@/lib/registration.server', () => ({
  isRegistrationOpen: () => true,
  REGISTRATION_CLOSED_I18N_KEY: 'onboarding.registrationClosedError',
}));
vi.mock('@/components/AuthHeader', () => ({ AuthHeader: () => null }));
vi.mock('web-haptics/react', () => ({ useWebHaptics: () => ({ trigger: vi.fn() }) }));
vi.mock('@tanstack/react-start/server', () => ({ getRequest: vi.fn() }));
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    handler: (fn: unknown) => fn,
    inputValidator: () => ({ handler: (fn: unknown) => fn }),
  }),
}));

import { Route } from '@/routes/onboarding';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

const profile: OnboardingInput = {
  fullName: 'QA Participant',
  iin: '050919501086',
  phone: '77001234567',
  city: 'Almaty',
  placeOfStudy: 'QA University',
  educationLevel: "Bachelor's",
  parentPhone: undefined,
};

describe('profile editor route caching', () => {
  it('keeps the saved city when reopening and changing only the name', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    let stored = { ...profile };
    // A delayed loader exposes mounting a form from stale cached data.
    getParticipant.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      return { ...stored };
    });
    upsertParticipant.mockImplementation(async (data: OnboardingInput) => {
      stored = { ...data };
    });
    const root = createRootRoute({ component: Outlet });
    const editorOptions = { id: '/onboarding', path: '/onboarding', getParentRoute: () => root };
    const editor = Route.update(editorOptions as Parameters<typeof Route.update>[0]);
    const dashboard = createRoute({
      getParentRoute: () => root,
      path: '/dashboard',
      component: () => <Link to="/onboarding">Edit profile</Link>,
    });
    const router = createRouter({
      routeTree: root.addChildren([editor, dashboard]),
      history: createMemoryHistory({ initialEntries: ['/onboarding'] }),
      defaultPreload: 'intent',
      defaultPreloadStaleTime: 60_000,
    });
    await router.load();
    const { i18n } = renderWithI18n(<RouterProvider router={router} />);
    const user = userEvent.setup();
    const city = await screen.findByRole('textbox', { name: /city/i });
    await user.clear(city);
    await user.type(city, 'Shymkent');
    await user.click(screen.getByRole('button', { name: i18n.t('onboarding.submit') }));
    await user.click(await screen.findByRole('link', { name: 'Edit profile' }));
    const reopenedCity = await screen.findByRole('textbox', { name: /city/i });
    expect(reopenedCity).toHaveProperty('value', 'Shymkent');
    const name = screen.getByRole('textbox', { name: /full name/i });
    await user.clear(name);
    await user.type(name, 'QA Updated');
    await user.click(screen.getByRole('button', { name: i18n.t('onboarding.submit') }));
    await screen.findByRole('link', { name: 'Edit profile' });
    expect(stored).toMatchObject({ fullName: 'QA Updated', city: 'Shymkent' });
    // Another session can update a profile while this editor is cached.
    stored.city = 'Astana';
    await user.click(screen.getByRole('link', { name: 'Edit profile' }));
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /full name/i })).toHaveProperty(
        'value',
        'QA Updated',
      ),
    );
    expect(screen.getByRole('textbox', { name: /city/i })).toHaveProperty('value', 'Astana');
    // Refreshing loader data while editing must preserve unsaved input.
    const draftCity = screen.getByRole('textbox', { name: /city/i });
    await user.clear(draftCity);
    await user.type(draftCity, 'Karaganda');
    await act(async () => {
      await router.invalidate({ sync: true });
    });
    expect(screen.getByRole('textbox', { name: /city/i })).toHaveProperty('value', 'Karaganda');
  });
});
