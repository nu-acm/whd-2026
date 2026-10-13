import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Lives apart from button.tsx so that file only exports components — a
 * non-component export there breaks React Fast Refresh.
 */
export const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium no-underline transition-colors duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-whd-pink-bright focus-visible:ring-offset-2 focus-visible:ring-offset-whd-dark disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'neon-button min-h-11 font-semibold',
        solid:
          'min-h-11 rounded-xl bg-whd-pink font-semibold text-whd-dark hover:bg-whd-pink-bright active:bg-whd-pink-soft',
        secondary:
          'min-h-11 rounded-xl bg-white/10 text-white hover:bg-white/15 active:bg-white/20',
        ghost:
          'min-h-11 rounded-lg text-white/80 hover:bg-white/10 hover:text-white active:bg-white/15',
        link: 'text-whd-pink-soft hover:text-whd-pink-bright',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-5 py-2 text-base',
        lg: 'px-8 py-4 text-xl md:text-2xl',
        icon: 'h-10 w-10 rounded-lg p-0',
        none: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
