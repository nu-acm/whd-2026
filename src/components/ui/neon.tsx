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
  interactive: _interactive,
  flat: _flat,
  className,
  ...props
}: NeonFrameProps) {
  return (
    <div
      data-slot="neon-frame"
      className={cn('neon-frame', size === 'sm' && 'neon-frame-sm', className)}
      {...props}
    />
  );
}

type NeonPanelProps = React.ComponentProps<'div'> & {
  /** Which edge touches a sibling panel; that edge is squared off. */
  position?: 'full' | 'top' | 'bottom';
  density?: 'default' | 'auth';
};

/** Content group inside a NeonFrame surface. */
export function NeonPanel({
  position = 'full',
  density = 'default',
  className,
  ...props
}: NeonPanelProps) {
  return (
    <div
      data-slot="neon-panel"
      className={cn(
        'neon-panel',
        density === 'auth' && (position === 'top' ? 'whd-auth-top' : 'whd-auth-bottom'),
        position === 'top' && 'neon-panel-top',
        position === 'bottom' && 'neon-panel-bottom',
        className,
      )}
      {...props}
    />
  );
}
