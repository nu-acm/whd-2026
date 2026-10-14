// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithI18n } from '@/test/render';
import { reportFixture } from '@/test/admin-fixtures';

const { getReportData, participantsToCsv } = vi.hoisted(() => ({
  getReportData: vi.fn(),
  participantsToCsv: vi.fn(),
}));
vi.mock('@/lib/report.server', () => ({ getReportData, participantsToCsv }));
vi.mock('@/lib/auth.server', () => ({ getSession: async () => ({ user: { id: 'admin' } }) }));
vi.mock('@/lib/admin.server', () => ({ sessionIsAdmin: () => true }));
vi.mock('@/lib/use-admin-refresh', () => ({ useAdminRefresh: vi.fn() }));
vi.mock('@tanstack/react-start/server', () => ({ getRequest: vi.fn() }));
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({ handler: (fn: unknown) => fn }),
}));
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
}));

import { Route } from '@/routes/_admin/admin';

let client: QueryClient;
beforeEach(() => {
  const data = reportFixture();
  getReportData.mockResolvedValue(data);
  participantsToCsv.mockReturnValue('Name,Email\nAlpha 10,participant0@example.test');
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['admin-report'], data);
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderPage() {
  const Page = Route.options.component!;
  return renderWithI18n(
    <QueryClientProvider client={client}>
      <Page />
    </QueryClientProvider>,
  );
}
const rowIds = () =>
  within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.id);
const headerButton = (name: string) =>
  within(screen.getByRole('columnheader', { name })).getByRole('button');
const columnButton = (name: string) =>
  within(screen.getByRole('group', { name: 'Columns' })).getByRole('button', { name });

describe('the admin report', () => {
  it('sorts naturally, filters eligibility and hidden search fields, and retains all matching rows', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(rowIds()).toEqual(['participant-p1', 'participant-p0', 'participant-p2']);
    await user.click(headerButton('Name'));
    expect(rowIds()).toEqual(['participant-p2', 'participant-p0', 'participant-p1']);
    expect(screen.getByRole('columnheader', { name: 'Name' }).getAttribute('aria-sort')).toBe(
      'descending',
    );
    await user.click(columnButton('Parent phone'));
    expect(screen.queryByRole('columnheader', { name: 'Parent phone' })).toBeNull();
    const search = screen.getByRole('textbox');
    await user.type(search, '77019998888');
    expect(rowIds()).toEqual(['participant-p0']);
    expect(screen.getByText('1 of 3')).toBeTruthy();
    await user.clear(search);
    const filters = screen.getByRole('group', { name: 'Filter' });
    await user.click(within(filters).getByRole('button', { name: 'Not eligible' }));
    expect(rowIds()).toEqual(['participant-p2']);
    expect(screen.getByText('1 of 1')).toBeTruthy();
    await user.click(within(filters).getByRole('button', { name: 'Eligible' }));
    expect(rowIds()).toEqual(['participant-p0', 'participant-p1']);
    await user.click(within(filters).getByRole('button', { name: 'All' }));
    await user.click(screen.getByRole('button', { name: 'Show all' }));
    await user.click(screen.getByRole('button', { name: 'Hide all' }));
    expect(rowIds()).toHaveLength(3);
    expect(within(screen.getByRole('table')).queryAllByRole('cell')).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Show all' }));
    expect(within(screen.getByRole('table')).getAllByRole('cell')).toHaveLength(36);
    expect(
      within(document.getElementById('participant-p0')!)
        .getByRole('link', { name: 'Open' })
        .getAttribute('href'),
    ).toBe('https://example.test/cv.pdf');
  });

  it('sorts team sizes, searches member names, and follows stable participant/team row links', async () => {
    const user = userEvent.setup();
    const scroll = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scroll,
    });
    renderPage();
    await user.click(
      within(document.getElementById('participant-p0')!).getByRole('button', { name: 'Team 2' }),
    );
    expect(rowIds()).toEqual(['team-team-2', 'team-team-10']);
    await waitFor(() => expect(scroll).toHaveBeenCalled());
    await user.click(headerButton('Size'));
    expect(rowIds()).toEqual(['team-team-10', 'team-team-2']);
    await user.type(screen.getByRole('textbox'), 'alpha 2');
    expect(rowIds()).toEqual(['team-team-2']);
    expect(screen.getByText('1 of 2')).toBeTruthy();
    await user.click(
      within(document.getElementById('team-team-2')!).getByRole('button', {
        name: 'alpha 2',
      }),
    );
    expect(rowIds()).toEqual(['participant-p1', 'participant-p0', 'participant-p2']);
    await waitFor(() => expect(scroll).toHaveBeenCalledTimes(2));
  });

  it('exports the complete server report independently of search and column visibility', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn().mockReturnValue('blob:report');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL, revokeObjectURL }));
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderPage();
    await user.type(screen.getByRole('textbox'), 'Zulu');
    await user.click(screen.getByRole('button', { name: 'Hide all' }));
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
    await waitFor(() =>
      expect(participantsToCsv).toHaveBeenCalledWith(reportFixture().participants),
    );
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(download).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:report');
  });
});
