import { useTranslation } from 'react-i18next';
import { FaCalendarAlt, FaMapMarkerAlt, FaUsers } from 'react-icons/fa';
import Stats2 from '@/components/ui/stats-2';
import { VENUE_MAP_URL } from '@/lib/event';
import { MIN_TEAM_SIZE, MAX_TEAM_SIZE } from '@/db/schema';

export default function InfoCards() {
  const { t } = useTranslation();
  const stats = [
    {
      id: 'when',
      icon: FaCalendarAlt,
      accent: 'pink' as const,
      label: t('infoCards.when'),
      metric: '14',
      subLabel: t('infoCards.monthYear'),
      description: t('infoCards.whenDetail'),
    },
    {
      id: 'where',
      icon: FaMapMarkerAlt,
      accent: 'purple' as const,
      label: t('infoCards.where'),
      metric: t('infoCards.whereDetail'),
      compactMetric: true,
      subLabel: t('infoCards.whereAnswer'),
      description: (
        <a href={VENUE_MAP_URL} target="_blank" rel="noopener noreferrer">
          {t('infoCards.mapLink')} <span aria-hidden="true">↗</span>
        </a>
      ),
    },
    {
      id: 'team',
      icon: FaUsers,
      accent: 'lime' as const,
      label: t('infoCards.teamLabel'),
      metric: `${MIN_TEAM_SIZE}–${MAX_TEAM_SIZE}`,
      subLabel: t('infoCards.teamMembers'),
      description: t('infoCards.howDetail'),
    },
  ];

  return (
    <section id="info" className="landing-container event-facts" aria-label={t('infoCards.label')}>
      <Stats2 stats={stats} />
    </section>
  );
}
