import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
export function Spinner({ className, ...props }: React.ComponentProps<typeof LoaderCircle>) {
  return (
    <LoaderCircle
      aria-hidden="true"
      data-slot="spinner"
      className={cn('whd-spinner', className)}
      {...props}
    />
  );
}
