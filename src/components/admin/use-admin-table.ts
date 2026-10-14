import { createElement } from 'react';
import {
  useTable,
  tableFeatures,
  rowSortingFeature,
  columnVisibilityFeature,
  createSortedRowModel,
  type ColumnDef,
  type Column,
  type Row,
  type Table,
} from '@tanstack/react-table';
import { compareText } from '@/components/admin/table-state';
import { AdminColumnHeader } from '@/components/admin/column-header';

export type AdminColumnMeta = {
  label: string;
  tone?: 'default' | 'muted' | 'numeric' | 'slug';
};
export const adminTableFeatures = tableFeatures({
  rowSortingFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  columnMeta: {} as AdminColumnMeta,
});
export type AdminColumnDef<T extends object> = ColumnDef<typeof adminTableFeatures, T>;
export type AdminTable<T extends object> = Table<typeof adminTableFeatures, T>;
export type AdminColumn<T extends object> = Column<typeof adminTableFeatures, T>;

function naturalTextSort<T extends object>(
  a: Row<typeof adminTableFeatures, T>,
  b: Row<typeof adminTableFeatures, T>,
  columnId: string,
) {
  return compareText(a.getValue<string | null>(columnId), b.getValue<string | null>(columnId));
}

/** The table owns column rendering, two-direction sorting, and visibility. */
export function useAdminTable<T extends object>(
  data: T[],
  columns: AdminColumnDef<T>[],
  initialSort: string,
  getRowId: (row: T) => string,
) {
  return useTable({
    features: adminTableFeatures,
    data,
    columns,
    getRowId,
    enableMultiSort: false,
    enableSortingRemoval: false,
    sortDescFirst: false,
    initialState: { sorting: [{ id: initialSort, desc: false }] },
    defaultColumn: {
      sortUndefined: false,
      sortFn: naturalTextSort,
      header: ({ column }) => createElement(AdminColumnHeader<T>, { column }),
    },
  });
}
