import { cn } from '@/lib/utils';

/** Shared filled surface for account and team content. */
export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn('group/card bg-whd-surface-raised rounded-2xl', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('p-6 md:p-8', className)} {...props} />;
}
