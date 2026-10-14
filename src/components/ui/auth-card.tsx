import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** Centred card used by the login and onboarding screens. */
export function AuthCard({
  title,
  subtitle,
  className,
  children,
  illustration,
  contentKey,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
  illustration?: React.ReactNode;
  contentKey?: string;
}) {
  if (illustration) {
    return (
      <main className="account-login-grid">
        {illustration}
        <Card variant="login" className={className}>
          <CardHeader variant="login">
            <CardTitle as="h1" variant="login">
              {title}
            </CardTitle>
            {subtitle && <CardDescription variant="login">{subtitle}</CardDescription>}
          </CardHeader>
          <CardContent key={contentKey} variant="login">
            {children}
          </CardContent>
        </Card>
      </main>
    );
  }
  return (
    <div className="whd-grid-bg relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
      {/* Star glow, echoing the landing hero */}
      <div
        aria-hidden="true"
        className="whd-auth-glow pointer-events-none absolute top-1/2 left-1/2 aspect-square -translate-x-1/2 -translate-y-1/2 bg-contain bg-center bg-no-repeat opacity-70"
      />

      <Card variant="auth" className={cn('relative w-full max-w-md', className)}>
        <CardHeader variant="auth">
          <CardTitle as="h1" variant="auth">
            {title}
          </CardTitle>
          {subtitle && <CardDescription variant="auth">{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent variant="auth">{children}</CardContent>
      </Card>
    </div>
  );
}
