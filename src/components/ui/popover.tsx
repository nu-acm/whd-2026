import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { cn } from '@/lib/utils';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverTitle = PopoverPrimitive.Title;
export const PopoverDescription = PopoverPrimitive.Description;

type ContentProps = Omit<PopoverPrimitive.Popup.Props, 'className'> & {
  className?: string;
};

export function PopoverContent({ className, ...props }: ContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner side="top" sideOffset={8} className="whd-popover-positioner">
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn('whd-popover', className)}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}
