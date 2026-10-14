import { cn } from '@/lib/utils';
export function Table({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'table'> & { variant?: 'default' | 'participants' | 'teams' | 'checkin' }) {
  return (
    <table
      data-slot="table"
      data-variant={variant}
      className={cn('whd-table', className)}
      {...props}
    />
  );
}
export function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead data-slot="table-header" className={cn('whd-table-header', className)} {...props} />
  );
}
export function TableBody(props: React.ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" {...props} />;
}
export function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return <tr data-slot="table-row" className={cn('whd-table-row', className)} {...props} />;
}
export function TableCell({
  className,
  tone = 'default',
  ...props
}: React.ComponentProps<'td'> & { tone?: 'default' | 'muted' | 'numeric' | 'slug' }) {
  return (
    <td
      data-slot="table-cell"
      data-tone={tone}
      className={cn('whd-table-cell', className)}
      {...props}
    />
  );
}
export function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return <th data-slot="table-head" className={cn('whd-table-head', className)} {...props} />;
}
