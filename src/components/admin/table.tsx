import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from '@/components/ui/table';
import { flexRender } from '@tanstack/react-table';
import type { AdminTable } from '@/components/admin/use-admin-table';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

/*
 * Pieces shared by the admin report and check-in tables: sortable headers,
 * show/hide column pills, and the stat tiles above them.
 */

export function ColumnToggleBar<T extends object>({ table }: { table: AdminTable<T> }) {
  const { t } = useTranslation();
  const columns = table.getAllLeafColumns().filter((column) => column.getCanHide());
  const allVisible = columns.every((column) => column.getIsVisible());
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button size="sm" variant="link" onClick={() => table.toggleAllColumnsVisible(!allVisible)}>
        {allVisible ? t('admin.hideAll') : t('admin.showAll')}
      </Button>
      <ToggleGroup
        multiple
        variant="columns"
        value={columns.filter((column) => column.getIsVisible()).map((column) => column.id)}
        onValueChange={(values) => {
          for (const column of columns)
            if (column.getIsVisible() !== values.includes(column.id)) column.toggleVisibility();
        }}
        aria-label={t('admin.columns')}
      >
        {columns.map((column) => (
          <ToggleGroupItem key={column.id} value={column.id} variant="columns">
            {column.columnDef.meta?.label ?? column.id}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

export function AdminDataTable<T extends object>({
  table,
  variant,
  rowPrefix,
}: {
  table: AdminTable<T>;
  variant: 'participants' | 'teams' | 'checkin';
  rowPrefix?: string;
}) {
  return (
    <Table variant={variant}>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => {
              const sorted = header.column.getIsSorted();
              return (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
                  aria-sort={sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow
            key={row.id}
            id={rowPrefix ? `${rowPrefix}-${row.id}` : undefined}
            className={rowPrefix ? 'scroll-mt-24' : undefined}
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id} tone={cell.column.columnDef.meta?.tone}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function StatCard({
  label,
  value,
  breakdown,
}: {
  label: string;
  value: number;
  breakdown?: string;
}) {
  return (
    <Card>
      <CardContent variant="stat">
        <div>
          <div className="text-3xl font-black text-whd-pink-bright md:text-4xl">{value}</div>
          <div className="mt-1 text-sm text-whd-text-muted">{label}</div>
        </div>
        {breakdown && (
          <div className="text-right text-sm text-whd-text-muted tabular-nums">{breakdown}</div>
        )}
      </CardContent>
    </Card>
  );
}
