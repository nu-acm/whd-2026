// @vitest-environment jsdom
import { afterEach, expect, it } from 'vite-plus/test';
import { useMemo, useState } from 'react';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAdminTable, type AdminColumnDef } from './use-admin-table';
import { AdminDataTable, ColumnToggleBar } from './table';
import { Input } from '@/components/ui/input';
import { renderWithI18n } from '@/test/render';

const data = [
  { id: 'a', name: 'Alpha 10', phone: '7700111' },
  { id: 'b', name: 'alpha 2', phone: '7700222' },
  { id: 'c', name: '', phone: '7700333' },
];
const columns: AdminColumnDef<(typeof data)[number]>[] = [
  {
    id: 'name',
    accessorFn: (row) => row.name,
    meta: { label: 'Name' },
    cell: ({ row }) => row.original.name || 'Empty name',
  },
  {
    id: 'phone',
    accessorFn: (row) => row.phone,
    meta: { label: 'Phone' },
    cell: ({ row }) => row.original.phone,
  },
];
const getRowId = (row: (typeof data)[number]) => row.id;
function Desk() {
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () =>
      data.filter((row) =>
        [row.name, row.phone].some((value) => value.toLowerCase().includes(query.toLowerCase())),
      ),
    [query],
  );
  const table = useAdminTable(filtered, columns, 'name', getRowId);
  return (
    <>
      <Input aria-label="Search" value={query} onChange={(event) => setQuery(event.target.value)} />
      <ColumnToggleBar table={table} />
      <p>Rows: {table.getRowModel().rows.length}</p>
      <AdminDataTable table={table} variant="participants" rowPrefix="participant" />
    </>
  );
}
afterEach(cleanup);
const rowIds = () =>
  within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.id);
it('preserves natural sorting, stable row IDs, search, and visibility through the actual table renderer', async () => {
  const user = userEvent.setup();
  renderWithI18n(<Desk />);
  expect(rowIds()).toEqual(['participant-b', 'participant-a', 'participant-c']);
  await user.click(screen.getByRole('columnheader', { name: 'Name' }).querySelector('button')!);
  expect(rowIds()).toEqual(['participant-c', 'participant-a', 'participant-b']);
  const toggles = screen.getByRole('group', { name: 'Columns' });
  await user.click(within(toggles).getByRole('button', { name: 'Phone' }));
  expect(screen.queryByText('7700111')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Show all' }));
  expect(screen.getByText('7700111')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Hide all' }));
  expect(rowIds()).toEqual(['participant-c', 'participant-a', 'participant-b']);
  expect(within(screen.getByRole('table')).queryAllByRole('cell')).toHaveLength(0);
  await user.click(screen.getByRole('button', { name: 'Show all' }));
  await user.type(screen.getByRole('textbox', { name: 'Search' }), '00222');
  expect(rowIds()).toEqual(['participant-b']);
  expect(screen.getByText('Rows: 1')).toBeTruthy();
});
