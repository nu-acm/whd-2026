import { cn } from '@/lib/utils';
export function Empty({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="empty" role="status" className={cn('whd-empty', className)} {...props} />;
}
export function EmptyDescription(props: React.ComponentProps<'p'>) {
  return <p data-slot="empty-description" {...props} />;
}
