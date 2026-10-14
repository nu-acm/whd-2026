import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
export function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="whd-native-select">
      <select data-slot="native-select" className={cn('whd-input', className)} {...props} />
      <ChevronDownIcon aria-hidden="true" />
    </div>
  );
}
