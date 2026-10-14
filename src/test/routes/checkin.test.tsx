// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { act, cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithI18n } from '@/test/render';
import type { CheckinData } from '@/lib/checkin.server';
import { checkinFixture } from '@/test/admin-fixtures';

const { setAttendance } = vi.hoisted(() => ({ setAttendance: vi.fn() }));
vi.mock('@/lib/checkin.server', () => ({ getCheckinData: vi.fn(), setAttendance }));
vi.mock('@/lib/auth.server', () => ({ getSession: async () => ({ user: { id: 'admin' } }) }));
vi.mock('@/lib/admin.server', () => ({ sessionIsAdmin: () => true }));
vi.mock('@/lib/use-admin-refresh', () => ({ useAdminRefresh: vi.fn() }));
vi.mock('@tanstack/react-start/server', () => ({ getRequest: vi.fn() }));
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    handler: (fn: unknown) => fn,
    validator: () => ({ handler: (fn: unknown) => fn }),
  }),
}));
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
}));

import { Route } from '@/routes/_admin/checkin';

const nativeFocus = Reflect.get(HTMLElement.prototype, 'focus') as (
  this: HTMLElement,
  options?: FocusOptions,
) => void;
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (
    this: HTMLElement,
    options?: FocusOptions,
  ) {
    if (options) void options.preventScroll;
    nativeFocus.call(this, options);
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

function renderPage(data: CheckinData) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['checkin-data'], data);
  const Page = Route.options.component!;
  renderWithI18n(
    <QueryClientProvider client={client}>
      <Page />
    </QueryClientProvider>,
  );
  return client;
}
const rowNames = () =>
  within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[1].textContent);

describe('the check-in desk', () => {
  it('sorts, searches phone numbers, filters attendance, and retains attendance controls when columns are hidden', async () => {
    const user = userEvent.setup();
    const client = renderPage(checkinFixture());
    expect(rowNames()).toEqual([
      'alpha 2',
      'Alpha 10',
      'Beta',
      'Charlie',
      'Delta',
      'Echo',
      'Foxtrot',
      'Hotel',
      'Zulu',
    ]);
    await user.click(
      within(screen.getByRole('columnheader', { name: 'Name' })).getByRole('button'),
    );
    expect(rowNames()[0]).toBe('Zulu');
    await user.type(screen.getByRole('textbox'), '77000000003');
    expect(rowNames()).toEqual(['Charlie']);
    expect(screen.getByText('1 of 9')).toBeTruthy();
    await user.clear(screen.getByRole('textbox'));
    const filters = screen.getByRole('group', { name: 'Filter' });
    await user.click(within(filters).getByRole('button', { name: 'Checked in' }));
    expect(rowNames()).toEqual(['Charlie', 'Beta', 'Alpha 10', 'alpha 2']);
    await user.click(screen.getByRole('button', { name: 'Hide all' }));
    expect(screen.getAllByRole('columnheader')).toHaveLength(1);
    expect(screen.getAllByRole('checkbox')).toHaveLength(4);
    await user.click(screen.getByRole('button', { name: 'Show all' }));
    expect(screen.getAllByRole('columnheader')).toHaveLength(5);
    await user.click(within(filters).getByRole('button', { name: 'Not checked in' }));
    expect(rowNames()).toEqual(['Zulu', 'Hotel', 'Foxtrot', 'Echo', 'Delta']);
    expect(setAttendance).not.toHaveBeenCalled();
    client.clear();
  });

  it('sorts teams by attendance, searches members, and filters readiness', async () => {
    const user = userEvent.setup();
    const client = renderPage(checkinFixture());
    await user.click(screen.getByRole('tab', { name: 'Teams' }));
    const teamNames = () =>
      within(screen.getByRole('table'))
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell')[0].textContent);
    expect(teamNames()).toEqual(['Team 2', 'Team 3', 'Team 10']);
    await user.click(
      within(screen.getByRole('columnheader', { name: 'Checked in' })).getByRole('button'),
    );
    expect(teamNames()).toEqual(['Team 3', 'Team 10', 'Team 2']);
    await user.type(screen.getByRole('textbox'), 'Delta');
    expect(teamNames()).toEqual(['Team 10']);
    await user.clear(screen.getByRole('textbox'));
    const filters = screen.getByRole('group', { name: 'Filter' });
    for (const [label, name, count] of [
      ['Ready', 'Team 2', '3/3'],
      ['Partial', 'Team 10', '1/3'],
      ['No-show', 'Team 3', '0/3'],
    ]) {
      await user.click(within(filters).getByRole('button', { name: label }));
      expect(teamNames()).toEqual([name]);
      expect(screen.getByText(count)).toBeTruthy();
    }
    client.clear();
  });

  it('cancels attendance confirmation without writing and restores focus after a confirmed update', async () => {
    const user = userEvent.setup();
    const client = renderPage(checkinFixture());
    const trigger = screen.getByRole('checkbox', { name: 'Mark Alpha 10 as not checked in' });
    await user.click(trigger);
    await screen.findByRole('alertdialog', { name: 'Undo check-in?' });
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' })),
    );
    await user.click(document.querySelector('[data-slot="alert-dialog-overlay"]')!);
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(setAttendance).not.toHaveBeenCalled();
    setAttendance.mockResolvedValue({ id: 'p0', attended: false });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Undo check-in' }));
    await waitFor(() => expect(setAttendance).toHaveBeenCalledWith('p0', false));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('checkbox', { name: 'Mark Alpha 10 as checked in' }),
      ),
    );
    expect(client.getQueryData<CheckinData>(['checkin-data'])!.teams[0].members[0].attended).toBe(
      false,
    );
    client.clear();
  });
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
    expect(screen.getByRole('checkbox', { name: /QA A/ }).getAttribute('aria-checked')).toBe(
      'true',
    );
    expect(screen.getByRole('checkbox', { name: /QA B/ }).getAttribute('aria-checked')).toBe(
      'true',
    );

    if (order === 'success-first') {
      await act(async () => b.resolve({ id: 'B', attended: true }));
      await act(async () => a.reject(new Error('Attendance unavailable')));
    } else {
      await act(async () => a.reject(new Error('Attendance unavailable')));
      expect(screen.getByRole('checkbox', { name: /QA B/ }).getAttribute('aria-checked')).toBe(
        'true',
      );
      await act(async () => b.resolve({ id: 'B', attended: true }));
    }
    await screen.findByRole('alert');
    expect(screen.getByRole('checkbox', { name: /QA A/ }).getAttribute('aria-checked')).toBe(
      'false',
    );
    expect(screen.getByRole('checkbox', { name: /QA B/ }).getAttribute('aria-checked')).toBe(
      'true',
    );
    const cached = client.getQueryData<CheckinData>(['checkin-data'])!;
    expect(cached.participants.map((p) => p.attended)).toEqual([false, true, false]);
    expect(cached.teams[0].members.map((p) => p.attended)).toEqual([false, true, false]);
    await user.click(screen.getByRole('tab', { name: 'Teams' }));
    expect(screen.getByText('1/3')).toBeTruthy();
    client.clear();
  });
});
