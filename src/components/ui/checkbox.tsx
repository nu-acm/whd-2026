import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
type Props = Omit<CheckboxPrimitive.Root.Props, 'className'> & { className?: string };
export function Checkbox({ className, ...props }: Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn('whd-checkbox', className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
