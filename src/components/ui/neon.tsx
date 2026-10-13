import { cn } from '@/lib/utils';

type NeonFrameProps = React.ComponentProps<'div'> & {
  /** Smaller surface radius. */
  size?: 'md' | 'sm';
  /** Legacy interaction hook; decoration does not imply clickability. */
  interactive?: boolean;
  /** Legacy compatibility flag for dense layouts. */
  flat?: boolean;
};

/**
 * Shared borderless surface. Keeps existing layouts and component API intact.
 */
export function NeonFrame({
  size = 'md',
  interactive = false,
  flat = false,
  className,
  ...props
}: NeonFrameProps) {
  return (
    <div
      data-slot="neon-frame"
      className={cn(
        'neon-frame',
        size === 'sm' && 'neon-frame-sm',
        interactive && 'neon-frame-interactive',
        flat && 'neon-frame-flat',
        className,
      )}
      {...props}
    />
  );
}

type NeonPanelProps = React.ComponentProps<'div'> & {
  /** Which edge touches a sibling panel; that edge is squared off. */
  position?: 'full' | 'top' | 'bottom';
};

/** Content group inside a NeonFrame surface. */
export function NeonPanel({ position = 'full', className, ...props }: NeonPanelProps) {
  return (
    <div
      data-slot="neon-panel"
      className={cn(
        'neon-panel',
        position === 'top' && 'neon-panel-top',
        position === 'bottom' && 'neon-panel-bottom',
        className,
      )}
      {...props}
    />
  );
}
