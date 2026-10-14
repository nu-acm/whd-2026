import { cn } from '@/lib/utils';
export function Notice({ className, ...props }: React.ComponentProps<'p'>) {
  return <p role="status" data-slot="alert" className={cn('whd-notice', className)} {...props} />;
}
