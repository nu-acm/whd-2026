import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="field-group" className={cn('whd-field-group', className)} {...props} />;
}
export function Field({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<'div'> & { orientation?: 'vertical' | 'horizontal' | 'responsive' }) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn('whd-field', className)}
      {...props}
    />
  );
}
export function FieldLabel({ className, ...props }: React.ComponentProps<'label'>) {
  return <label data-slot="field-label" className={cn('whd-field-label', className)} {...props} />;
}
export function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-description"
      className={cn('whd-field-description', className)}
      {...props}
    />
  );
}
export function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<'div'> & { errors?: Array<{ message?: string } | undefined> }) {
  const content = useMemo(() => {
    if (children) return children;
    const messages = [
      ...new Set(errors?.flatMap((error) => (error?.message ? [error.message] : [])) ?? []),
    ];
    if (!messages.length) return null;
    if (messages.length === 1) return messages[0];
    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    );
  }, [children, errors]);
  if (!content) return null;
  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn('whd-field-error', className)}
      {...props}
    >
      {content}
    </div>
  );
}
