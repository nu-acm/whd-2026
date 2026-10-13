import { cn } from '@/lib/utils';

const controlClasses = [
  'border-transparent bg-whd-dark w-full rounded-xl border px-4 py-2.5 text-base text-white',
  'transition-colors duration-200 outline-none',
  'focus:border-whd-pink focus:ring-whd-pink focus:ring-2',
  'aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:ring-red-400/30',
  'disabled:cursor-not-allowed disabled:opacity-50',
];

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(controlClasses, 'placeholder:text-whd-text-muted', className)}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(controlClasses, '[&>option]:bg-whd-purple-deep cursor-pointer', className)}
      {...props}
    />
  );
}
