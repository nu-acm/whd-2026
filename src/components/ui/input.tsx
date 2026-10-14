import { Input as InputPrimitive } from '@base-ui/react/input';
import { cn } from '@/lib/utils';
import { NativeSelect } from '@/components/ui/native-select';

type InputProps = Omit<InputPrimitive.Props, 'className'> & {
  className?: string;
  variant?: 'default' | 'group';
};
export function Input({ className, variant = 'default', ...props }: InputProps) {
  return (
    <InputPrimitive
      data-slot="input"
      data-variant={variant}
      className={cn('whd-input', className)}
      {...props}
    />
  );
}
export { NativeSelect as Select };
