import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
export function InputGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn('whd-input-group', className)}
      {...props}
    />
  );
}
export function InputGroupInput(props: React.ComponentProps<typeof Input>) {
  return <Input variant="group" data-slot="input-group-control" {...props} />;
}
export function InputGroupAddon({
  className,
  align = 'inline-start',
  ...props
}: React.ComponentProps<'div'> & { align?: 'inline-start' | 'inline-end' }) {
  return (
    <div
      data-slot="input-group-addon"
      data-align={align}
      className={cn('whd-input-addon', className)}
      {...props}
    />
  );
}
export function InputGroupButton(props: React.ComponentProps<typeof Button>) {
  return <Button variant="input-action" size="icon" {...props} />;
}
