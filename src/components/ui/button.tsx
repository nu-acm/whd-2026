import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cn } from '@/lib/utils';
import { buttonVariants, type ButtonVariantProps } from '@/components/ui/button-variants';
export { buttonVariants } from '@/components/ui/button-variants';

type ButtonProps = Omit<ButtonPrimitive.Props, 'className'> &
  ButtonVariantProps & { className?: string };
export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
type LinkButtonProps = React.ComponentProps<'a'> & ButtonVariantProps;
export function LinkButton({ className, variant, size, ...props }: LinkButtonProps) {
  return (
    <a data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
