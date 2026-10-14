import { cva, type VariantProps } from 'class-variance-authority';

/** Shared by Button and link adapters; button.tsx exposes the standard shadcn export. */
export const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium no-underline transition-colors duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-whd-pink-bright focus-visible:ring-offset-2 focus-visible:ring-offset-whd-dark disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'neon-button min-h-11 font-semibold',
        primary: 'neon-button min-h-11 font-semibold',
        solid:
          'min-h-11 rounded-xl bg-whd-pink font-semibold text-whd-dark hover:bg-whd-pink-bright active:bg-whd-pink-soft',
        secondary:
          'min-h-11 rounded-xl bg-whd-text/10 text-whd-text hover:bg-whd-text/15 active:bg-whd-text/20',
        outline:
          'min-h-11 rounded-xl bg-whd-text/10 text-whd-text hover:bg-whd-text/15 active:bg-whd-text/20',
        ghost:
          'min-h-11 rounded-lg text-whd-text/80 hover:bg-whd-text/10 hover:text-whd-text active:bg-whd-text/15',
        feature: 'feature-two-action neon-button min-h-11 font-semibold',
        link: 'min-h-11 text-whd-pink-soft hover:text-whd-pink-bright',
        'table-link':
          'min-h-11 justify-start font-normal whitespace-normal text-left text-whd-pink-soft hover:text-whd-pink-bright hover:underline',
        'table-sort': 'min-h-11 gap-1 font-normal text-whd-text-muted hover:text-foreground',
        'table-sort-active':
          'min-h-11 gap-1 font-normal text-whd-pink-bright hover:text-foreground',
        destructive: 'min-h-11 rounded-xl bg-danger text-whd-text hover:bg-danger-hover',
        'confirm-danger':
          'min-h-11 rounded-xl border border-destructive/70 text-destructive hover:border-destructive hover:bg-destructive/10',
        'confirm-accent':
          'min-h-11 rounded-xl bg-whd-pink text-whd-purple-deep hover:bg-whd-pink-bright',
        'input-action':
          'min-h-11 rounded-xl text-whd-pink-soft hover:bg-whd-text/5 hover:text-whd-pink-bright',
      },
      size: {
        default: 'px-5 py-2 text-base',
        xs: 'px-2 py-1 text-xs',
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-5 py-2 text-base',
        lg: 'px-8 py-4 text-xl md:text-2xl',
        icon: 'size-11 rounded-lg p-0',
        'icon-xs': 'size-11 rounded-lg p-0',
        'icon-sm': 'size-11 rounded-lg p-0',
        'icon-lg': 'size-12 rounded-xl p-0',
        none: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
