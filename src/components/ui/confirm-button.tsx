import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ButtonVariantProps } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';

const CONFIRM_RESET_MS = 3000;

type ConfirmButtonProps = ButtonVariantProps & {
  label: string;
  /** Shown after the first click; a second click within 3s runs `onConfirm`. */
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  className?: string;
  /** Styles for the armed state; defaults to red, which vanishes on pink backgrounds. */
  armedClassName?: string;
};

/**
 * Two-step button for destructive actions: the first click arms it, the second
 * confirms. It disarms itself after 3 seconds. Inline, so no modal steals focus.
 */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  disabled = false,
  loading = false,
  loadingLabel,
  variant = 'secondary',
  size = 'sm',
  className,
  armedClassName = 'border-red-500/70 text-red-300 hover:border-red-500 hover:bg-red-500/10',
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => clearTimer, []);

  const handleClick = () => {
    if (disabled || loading) return;
    clearTimer();
    if (!armed) {
      setArmed(true);
      timeoutRef.current = window.setTimeout(() => setArmed(false), CONFIRM_RESET_MS);
      return;
    }
    setArmed(false);
    onConfirm();
  };

  const showConfirm = armed && !loading;

  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || loading}
      onClick={handleClick}
      className={cn(className, showConfirm && armedClassName)}
    >
      {loading ? (loadingLabel ?? '…') : showConfirm ? confirmLabel : label}
    </Button>
  );
}
