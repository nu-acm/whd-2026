import { cn } from '@/lib/utils';
export function Item({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'li'> & { variant?: 'default' | 'member' | 'empty-member' }) {
  return (
    <li
      data-slot="item"
      className={cn(
        variant === 'empty-member'
          ? 'account-member account-member-empty'
          : variant === 'member'
            ? 'account-member'
            : 'whd-item',
        className,
      )}
      {...props}
    />
  );
}
