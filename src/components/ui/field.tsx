import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export function FieldSet({ className, ...props }: React.ComponentProps<'fieldset'>) {
  return <fieldset data-slot="field-set" className={cn('whd-field-set', className)} {...props} />;
}
export function FieldLegend({
  className,
  variant = 'legend',
  ...props
}: React.ComponentProps<'legend'> & { variant?: 'legend' | 'label' }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn('whd-field-legend', className)}
      {...props}
    />
  );
}
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
export function FieldContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="field-content" className={cn('whd-field-content', className)} {...props} />
  );
}
export function FieldLabel({ className, ...props }: React.ComponentProps<'label'>) {
  return <label data-slot="field-label" className={cn('whd-field-label', className)} {...props} />;
}
export function FieldTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="field-label" className={cn('whd-field-label', className)} {...props} />;
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
export function FieldSeparator({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn('whd-field-separator', className)}
      {...props}
    >
      <Separator />
      {children && (
        <>
          <span data-slot="field-separator-content">{children}</span>
          <Separator />
        </>
      )}
    </div>
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
