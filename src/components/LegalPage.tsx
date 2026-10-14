import { Link } from '@tanstack/react-router';
import { AuthHeader } from '@/components/AuthHeader';

/** Shared layout for /terms and /privacy. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-whd-dark">
      <AuthHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:px-8">
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
        <p className="mt-2 mb-10 text-sm text-whd-text-muted">Last updated: {updated}</p>
        <div className="space-y-8 text-base leading-relaxed text-whd-text-muted">{children}</div>
        <Link
          to="/"
          className="mt-12 inline-block text-sm text-whd-pink-soft transition-colors hover:text-whd-pink-bright"
        >
          ← Back to home
        </Link>
      </main>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function ContactLink({ email }: { email: string }) {
  return (
    <a href={`mailto:${email}`} className="text-whd-pink-soft underline hover:text-whd-pink-bright">
      {email}
    </a>
  );
}
