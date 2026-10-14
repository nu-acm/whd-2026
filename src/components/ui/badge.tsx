import { cn } from '@/lib/utils';
export function Badge({
  className,
  variant = 'default',
  complete = false,
  ...props
}: React.ComponentProps<'span'> & { variant?: 'default' | 'status'; complete?: boolean }) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(
        variant === 'status' ? 'account-status-tag' : 'whd-badge',
        complete && 'is-complete',
        className,
      )}
      {...props}
    />
  );
}
