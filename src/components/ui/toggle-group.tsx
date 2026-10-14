import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group';
import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import { cn } from '@/lib/utils';
export function ToggleGroup({
  className,
  variant = 'default',
  ...props
}: Omit<ToggleGroupPrimitive.Props, 'className'> & {
  className?: string;
  variant?: 'default' | 'language' | 'columns';
}) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      className={cn(
        variant === 'language'
          ? 'whd-language-group'
          : variant === 'columns'
            ? 'whd-column-group'
            : 'whd-segmented',
        className,
      )}
      {...props}
    />
  );
}
export function ToggleGroupItem({
  className,
  variant = 'default',
  size = 'sm',
  ...props
}: Omit<TogglePrimitive.Props, 'className'> & {
  className?: string;
  variant?: 'default' | 'language' | 'columns';
  size?: 'sm' | 'md';
}) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      data-size={size}
      className={cn(
        variant === 'language'
          ? 'whd-language-toggle'
          : variant === 'columns'
            ? 'whd-column-toggle'
            : 'whd-toggle',
        className,
      )}
      {...props}
    />
  );
}
