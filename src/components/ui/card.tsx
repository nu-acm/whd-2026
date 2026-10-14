import { cn } from '@/lib/utils';
type CardProps = React.ComponentProps<'div'> & {
  size?: 'default' | 'sm';
  accent?: 'pink' | 'purple' | 'lime';
  variant?:
    | 'default'
    | 'auth'
    | 'login'
    | 'team'
    | 'create-team'
    | 'cv'
    | 'no-team'
    | 'dashboard-stat'
    | 'feature'
    | 'event';
};
export function Card({
  className,
  accent,
  variant = 'default',
  size = 'default',
  ...props
}: CardProps) {
  const appearance = {
    default: 'whd-card',
    auth: 'neon-frame',
    login: 'account-login-card',
    team: 'account-team-card',
    'create-team': 'account-create-team-card',
    cv: 'account-cv-card',
    'no-team': 'account-team-card',
    'dashboard-stat': 'dashboard-stat',
    feature: 'feature-two-card',
    event: 'event-stat-card',
  };
  return (
    <div
      data-slot="card"
      data-variant={variant}
      data-size={size}
      className={cn(
        'group/card bg-whd-surface-raised rounded-2xl',
        appearance[variant],
        variant === 'event' &&
          (accent === 'purple'
            ? 'event-stat-purple'
            : accent === 'lime'
              ? 'event-stat-lime'
              : false),
        className,
      )}
      {...props}
    />
  );
}
type ContentProps = React.ComponentProps<'div'> & {
  variant?:
    | 'default'
    | 'auth'
    | 'login'
    | 'team'
    | 'create-team'
    | 'cv'
    | 'no-team'
    | 'dashboard-stat'
    | 'feature'
    | 'event'
    | 'stat';
};
export function CardContent({ className, variant = 'default', ...props }: ContentProps) {
  const appearance = {
    default: 'whd-card-content',
    auth: 'neon-panel neon-panel-bottom whd-auth-bottom',
    login: 'account-login-content',
    team: 'account-team-content',
    'create-team': 'account-create-team-content',
    cv: 'account-cv-content',
    'no-team': 'account-no-team-content',
    'dashboard-stat': 'dashboard-stat-content',
    feature: 'feature-two-card-content',
    event: 'event-stat-content',
    stat: 'whd-stat-content',
  };
  return (
    <div
      data-slot="card-content"
      className={cn('whd-card-content', appearance[variant], className)}
      {...props}
    />
  );
}
export function CardHeader({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & {
  variant?: 'default' | 'team' | 'account' | 'login' | 'cv' | 'no-team' | 'auth';
}) {
  const appearance = {
    default: 'whd-card-header',
    team: 'whd-team-header',
    account: 'account-card-heading',
    login: 'account-login-header whd-auth-heading',
    cv: 'whd-cv-header',
    'no-team': 'whd-no-team-header',
    auth: 'neon-panel neon-panel-top whd-auth-top',
  };
  return <div data-slot="card-header" className={cn(appearance[variant], className)} {...props} />;
}
export function CardTitle({
  className,
  as: Tag = 'h2',
  variant = 'default',
  ...props
}: React.ComponentProps<'h2'> & {
  as?: 'h1' | 'h2' | 'h3';
  variant?: 'default' | 'team' | 'account' | 'auth' | 'login';
}) {
  const appearance = {
    default: 'whd-card-title',
    team: 'account-team-name',
    account: 'account-card-title',
    auth: 'neon-text text-2xl font-bold text-whd-text sm:text-3xl',
    login: 'whd-card-title',
  };
  return <Tag data-slot="card-title" className={cn(appearance[variant], className)} {...props} />;
}
export function CardDescription({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'p'> & { variant?: 'default' | 'account' | 'login' | 'auth' | 'warning' }) {
  const appearance = {
    default: 'whd-card-description',
    account: 'whd-account-description',
    login: 'account-form-subtitle',
    auth: 'whd-auth-description',
    warning: 'whd-warning-description',
  };
  return (
    <p data-slot="card-description" className={cn(appearance[variant], className)} {...props} />
  );
}
export function CardFooter({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & { variant?: 'default' | 'team' }) {
  return (
    <div
      data-slot="card-footer"
      className={cn(variant === 'team' ? 'whd-team-footer' : 'whd-card-footer', className)}
      {...props}
    />
  );
}

export function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-action" className={cn('whd-card-action', className)} {...props} />;
}
