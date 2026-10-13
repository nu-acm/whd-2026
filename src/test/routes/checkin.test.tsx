// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithI18n } from '@/test/render';
import type { CheckinData } from '@/lib/checkin.server';

const { setAttendance } = vi.hoisted(() => ({ setAttendance: vi.fn() }));
vi.mock('@/lib/checkin.server', () => ({ getCheckinData: vi.fn(), setAttendance }));
vi.mock('@/lib/auth.server', () => ({ getSession: async () => ({ user: { id: 'admin' } }) }));
vi.mock('@/lib/admin.server', () => ({ sessionIsAdmin: () => true }));
vi.mock('@/lib/use-admin-refresh', () => ({ useAdminRefresh: vi.fn() }));
vi.mock('@tanstack/react-start/server', () => ({ getRequest: vi.fn() }));
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    handler: (fn: unknown) => fn,
    inputValidator: () => ({ handler: (fn: unknown) => fn }),
  }),
}));
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
}));

import { Route } from '@/routes/_admin/checkin';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function fixture(): CheckinData {
  const participants = ['A', 'B', 'C'].map((id) => ({
    id,
    fullName: `QA ${id}`,
    iin: '050919501086',
    phone: '77001234567',
    teamId: 'team',
    teamName: 'QA Team',
    placeOfStudy: 'QA University',
    educationLevel: "Bachelor's",
    attended: false,
  }));
  return {
    participants,
    teams: [{ id: 'team', name: 'QA Team', captainName: 'QA A', members: participants }],
  };
}

function deferred() {
  let resolve!: (value: { id: string; attended: boolean }) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<{ id: string; attended: boolean }>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('concurrent attendance changes', () => {
  it.each(['success-first', 'failure-first'])('preserves another toggle: %s', async (order) => {
    const a = deferred();
    const b = deferred();
    setAttendance.mockImplementation((id: string) => (id === 'A' ? a.promise : b.promise));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['checkin-data'], fixture());
    const Page = Route.options.component!;
    renderWithI18n(
      <QueryClientProvider client={client}>
        <Page />
      </QueryClientProvider>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('checkbox', { name: /QA A/ }));
    await user.click(screen.getByRole('checkbox', { name: /QA B/ }));
    await waitFor(() => expect(setAttendance).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('checkbox', { name: /QA A/ })).toHaveProperty('checked', true);
    expect(screen.getByRole('checkbox', { name: /QA B/ })).toHaveProperty('checked', true);

    if (order === 'success-first') {
      await act(async () => b.resolve({ id: 'B', attended: true }));
      await act(async () => a.reject(new Error('Attendance unavailable')));
    } else {
      await act(async () => a.reject(new Error('Attendance unavailable')));
      expect(screen.getByRole('checkbox', { name: /QA B/ })).toHaveProperty('checked', true);
      await act(async () => b.resolve({ id: 'B', attended: true }));
    }
    await screen.findByRole('alert');
    expect(screen.getByRole('checkbox', { name: /QA A/ })).toHaveProperty('checked', false);
    expect(screen.getByRole('checkbox', { name: /QA B/ })).toHaveProperty('checked', true);
    const cached = client.getQueryData<CheckinData>(['checkin-data'])!;
    expect(cached.participants.map((p) => p.attended)).toEqual([false, true, false]);
    expect(cached.teams[0].members.map((p) => p.attended)).toEqual([false, true, false]);
    await user.click(screen.getByRole('button', { name: 'Teams' }));
    expect(screen.getByText('1/3')).toBeTruthy();
    client.clear();
  });
});
