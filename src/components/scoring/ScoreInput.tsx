import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';

type ScoreInputProps = Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'max'> & {
  value: string;
  max: number;
  onValueChange: (value: string) => void;
};

export function ScoreInput({ value, max, onValueChange, ...props }: ScoreInputProps) {
  const digits = String(max).length;
  return (
    <Input
      {...props}
      type="text"
      variant="score"
      inputMode="numeric"
      autoComplete="off"
      pattern={`[0-9]{1,${digits}}`}
      value={value}
      onChange={(event) => {
        const next = event.target.value;
        if (
          next === '' ||
          (/^[0-9]+$/.test(next) && next.length <= digits && Number(next) <= max)
        ) {
          onValueChange(next);
        }
      }}
    />
  );
}
