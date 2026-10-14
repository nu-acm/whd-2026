import { Button } from '@/components/ui/button';
import type { AdminColumn } from '@/components/admin/use-admin-table';

export function AdminColumnHeader<T extends object>({ column }: { column: AdminColumn<T> }) {
  const label = column.columnDef.meta?.label ?? column.id;
  if (!column.getCanSort()) return label;
  const sorted = column.getIsSorted();
  return (
    <Button
      variant={sorted ? 'table-sort-active' : 'table-sort'}
      size="none"
      onClick={column.getToggleSortingHandler()}
    >
      {label}
      <span aria-hidden="true" className={sorted ? '' : 'opacity-0'}>
        {sorted === 'desc' ? '↓' : '↑'}
      </span>
    </Button>
  );
}
