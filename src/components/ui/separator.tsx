import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';
import { cn } from '@/lib/utils';

type SeparatorProps = Omit<React.ComponentProps<typeof SeparatorPrimitive>, 'className'> & {
  className?: string;
} & {
  orientation?: 'horizontal' | 'vertical';
};

export function Separator({ className, orientation = 'horizontal', ...props }: SeparatorProps) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        'bg-whd-border shrink-0',
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px self-stretch',
        className,
      )}
      {...props}
    />
  );
}
