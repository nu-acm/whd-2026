import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type EventStat = {
  id: string;
  icon: IconType;
  accent: 'pink' | 'purple' | 'lime';
  label: string;
  metric: string;
  compactMetric?: boolean;
  subLabel: ReactNode;
  description: ReactNode;
};

/** Watermelon stats-2, adapted to WHD content, tokens and motion preferences.
 * Source: https://registry.watermelon.sh/r/stats-2.json
 */
export default function Stats2({ stats }: { stats: EventStat[] }) {
  return (
    <div className="event-stats-grid">
      {stats.map((stat) => (
        <Card key={stat.id} variant="event" accent={stat.accent}>
          <div className="event-stat-glow" aria-hidden="true" />
          <div className="event-stat-accent" aria-hidden="true" />
          <CardContent variant="event">
            <dl>
              <dt className="event-stat-badge">
                <stat.icon aria-hidden="true" />
                {stat.label}
              </dt>
              <dd
                className={cn('event-stat-metric', stat.compactMetric && 'event-stat-metric-place')}
              >
                {stat.metric}
              </dd>
            </dl>
            <p className="event-stat-subtitle">
              <span aria-hidden="true" />
              {stat.subLabel}
            </p>
            <div className="event-stat-description">{stat.description}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
