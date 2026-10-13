import { useTranslation } from 'react-i18next';
import { FaCalendarPlus, FaCircleCheck, FaFlagCheckered } from 'react-icons/fa6';
import Stats3 from '@/components/ui/stats-3';

const ITEMS = [
  { dateKey: 'registration', labelKey: 'registrationLabel', icon: FaCalendarPlus, accent: 'pink' },
  { dateKey: 'confirmation', labelKey: 'confirmationLabel', icon: FaCircleCheck, accent: 'purple' },
  { dateKey: 'event', labelKey: 'eventLabel', icon: FaFlagCheckered, accent: 'lime' },
] as const;

export default function Timeline() {
  const { t } = useTranslation();
  return (
    <Stats3
      title={t('timeline.title')}
      dates={ITEMS.map((item) => ({
        id: item.dateKey,
        icon: item.icon,
        accent: item.accent,
        value: t(`timeline.items.${item.dateKey}`),
        label: t(`timeline.items.${item.labelKey}`),
      }))}
    />
  );
}
