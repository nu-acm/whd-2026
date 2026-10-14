import { useId } from 'react';
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';

type FormFieldProps = {
  label: string;
  hint?: string;
  /** Already translated; rendered below the control and wired up via aria. */
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  children: (props: {
    id: string;
    'aria-invalid': boolean;
    'aria-required'?: boolean;
    'aria-describedby'?: string;
  }) => React.ReactNode;
};

/** Label + control + hint/error, with the aria wiring done once. */
export function FormField({
  label,
  hint,
  error,
  required,
  disabled,
  className,
  children,
}: FormFieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <Field data-invalid={!!error} data-disabled={disabled || undefined} className={className}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-whd-pink-bright">*</span>}
      </FieldLabel>

      {children({
        id,
        'aria-invalid': !!error,
        'aria-required': required || undefined,
        'aria-describedby': describedBy,
      })}

      {error ? (
        <FieldError id={`${id}-error`}>{error}</FieldError>
      ) : hint ? (
        <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>
      ) : null}
    </Field>
  );
}
