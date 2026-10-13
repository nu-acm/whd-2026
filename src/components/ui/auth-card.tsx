import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { NeonFrame, NeonPanel } from '@/components/ui/neon';

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
        <Card className={cn('account-login-card', className)}>
          <CardContent key={contentKey} className="account-login-content">
            <h1>{title}</h1>
            {subtitle && <p className="account-form-subtitle">{subtitle}</p>}
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
        className="pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[min(900px,140vw)] -translate-x-1/2 -translate-y-1/2 bg-[url('/whd/star-glow.webp')] bg-contain bg-center bg-no-repeat opacity-70"
      />

      <NeonFrame className={cn('relative w-full max-w-md', className)}>
        <NeonPanel position="top" className="px-6 py-5 sm:px-8">
          <h1 className="neon-text text-2xl font-bold text-white sm:text-3xl">{title}</h1>
        </NeonPanel>
        <NeonPanel position="bottom" className="px-6 pt-5 pb-7 sm:px-8">
          {subtitle && <p className="text-whd-text-muted text-sm leading-relaxed">{subtitle}</p>}
          <div className={cn(subtitle && 'mt-6')}>{children}</div>
        </NeonPanel>
      </NeonFrame>
    </div>
  );
}
