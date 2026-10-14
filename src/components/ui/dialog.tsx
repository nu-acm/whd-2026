import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { cn } from '@/lib/utils';
export const Dialog = DialogPrimitive.Root;
export const DialogTitle = DialogPrimitive.Title;
type ContentProps = Omit<DialogPrimitive.Popup.Props, 'className'> & {
  className?: string;
  variant?: 'default' | 'gallery';
};
export function DialogContent({ className, variant = 'default', ...props }: ContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop data-slot="dialog-overlay" className="whd-dialog-backdrop" />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn('whd-popup', variant === 'gallery' && 'gallery-dialog', className)}
        {...props}
      />
    </DialogPrimitive.Portal>
  );
}
