import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { MAX_TEAM_SIZE, MIN_TEAM_SIZE } from '@/db/schema';
import type { TeamData } from '@/lib/team.server';
import { CircleCheck, CircleAlert, Users, CalendarDays, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

function StatTile({
  label,
  value,
  detail,
  valueClassName,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  valueClassName?: string;
  icon: LucideIcon;
}) {
  return (
    <Card variant="dashboard-stat">
      <CardContent variant="dashboard-stat">
        <Icon className="dashboard-stat-icon" aria-hidden="true" />
        <p className="dashboard-stat-label">{label}</p>
        <p className={cn('dashboard-stat-value', valueClassName)}>{value}</p>
        <p className="dashboard-stat-detail">{detail}</p>
      </CardContent>
    </Card>
  );
}

/** At-a-glance status: is my registration complete, which team, when and where. */
export function DashboardStats({ team }: { team: TeamData | null }) {
  const { t } = useTranslation();
  const ready = !!team && team.members.length >= MIN_TEAM_SIZE;

  return (
    <div className="dashboard-stats">
      <StatTile
        icon={ready ? CircleCheck : CircleAlert}
        label={t('dashboard.statusLabel')}
        value={ready ? t('dashboard.statusReady') : t('dashboard.statusWarning')}
        detail={
          !team
            ? t('dashboard.noTeam')
            : ready
              ? t('dashboard.teamReady')
              : t('dashboard.teamIncomplete', { min: MIN_TEAM_SIZE })
        }
        valueClassName={ready ? 'text-whd-pink-bright' : 'text-warning'}
      />
      <StatTile
        icon={Users}
        label={t('dashboard.teamLabel')}
        value={team?.name ?? '—'}
        detail={
          team
            ? t('dashboard.membersCount', { count: team.members.length, max: MAX_TEAM_SIZE })
            : t('dashboard.noTeamShort')
        }
      />
      <StatTile
        icon={CalendarDays}
        label={t('dashboard.eventLabel')}
        value={t('timeline.items.event')}
        detail={t('infoCards.whereAnswer')}
      />
    </div>
  );
}
