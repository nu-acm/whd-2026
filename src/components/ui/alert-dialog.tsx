import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
export const AlertDialog = AlertDialogPrimitive.Root;
export function AlertDialogTitle(props: AlertDialogPrimitive.Title.Props) {
  return <AlertDialogPrimitive.Title className="whd-popup-title" {...props} />;
}
export function AlertDialogDescription(props: AlertDialogPrimitive.Description.Props) {
  return <AlertDialogPrimitive.Description className="whd-popup-description" {...props} />;
}
export const AlertDialogCancel = AlertDialogPrimitive.Close;
export function AlertDialogContent(props: AlertDialogPrimitive.Popup.Props) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop
        data-slot="alert-dialog-overlay"
        className="whd-dialog-backdrop"
      />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        className="whd-popup whd-confirm-popup"
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  );
}
