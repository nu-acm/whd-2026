import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';

type ScoreInputProps = Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'max'> & {
  value: string;
  max: number;
  decimal?: boolean;
  onValueChange: (value: string) => void;
};

export function ScoreInput({
  value,
  max,
  decimal = false,
  onValueChange,
  ...props
}: ScoreInputProps) {
  const digits = String(max).length;
  const pattern = `[0-9]{1,${digits}}${decimal ? '([.][0-9])?' : ''}`;
  const editingPattern = new RegExp(`^[0-9]{1,${digits}}${decimal ? '([.][0-9]?)?' : ''}$`);
  return (
    <Input
      {...props}
      type="text"
      variant="score"
      inputMode={decimal ? 'decimal' : 'numeric'}
      autoComplete="off"
      pattern={pattern}
      value={value}
      onChange={(event) => {
        const next = decimal ? event.target.value.replace(',', '.') : event.target.value;
        if (next === '' || (editingPattern.test(next) && Number(next) <= max)) {
          onValueChange(next);
        }
      }}
    />
  );
}
