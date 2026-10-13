import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PencilLine } from 'lucide-react';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import type { TeamData } from '@/lib/team.server';

export function DashboardLayout({
  fullName,
  team,
  feedback,
  children,
  sidebar,
}: {
  fullName: string;
  team: TeamData | null;
  feedback?: ReactNode;
  children: ReactNode;
  sidebar: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <main className="dashboard-main">
      <section className="dashboard-welcome" aria-labelledby="dashboard-title">
        <div className="dashboard-welcome-copy">
          <p className="account-eyebrow">{t('dashboard.title')}</p>
          <h1 id="dashboard-title">{t('dashboard.greeting', { name: fullName })}</h1>
          <Link to="/onboarding" className="account-profile-link">
            <PencilLine size={16} aria-hidden="true" />
            {t('dashboard.editProfile')}
          </Link>
        </div>
        <img
          src="/whd/mascot-faq.webp"
          alt=""
          width={499}
          height={528}
          className="dashboard-mascot"
        />
      </section>
      <DashboardStats team={team} />
      {feedback}
      <div className="dashboard-columns">
        <div className="dashboard-team-column">{children}</div>
        <aside className="dashboard-sidebar">{sidebar}</aside>
      </div>
    </main>
  );
}
