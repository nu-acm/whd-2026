import { useTranslation } from 'react-i18next';
import { EVENT_SCHEDULE } from '@/lib/event';
import SectionHeading from '@/components/landing/SectionHeading';

const COLUMNS = [EVENT_SCHEDULE.slice(0, 4), EVENT_SCHEDULE.slice(4)];

export default function Schedule() {
  const { t } = useTranslation();
  return (
    <section id="schedule" className="landing-section landing-container">
      <SectionHeading title={t('schedule.title')} />
      <div className="schedule-columns">
        {COLUMNS.map((events, i) => (
          <div key={i}>
            <h3 className="schedule-period">
              {t(i === 0 ? 'schedule.morning' : 'schedule.afternoon')}
            </h3>
            <ol start={i * 4 + 1} className="schedule-list">
              {events.map((event) => (
                <li
                  key={event.id}
                  className={
                    ['mathematics', 'programming', 'productDesign'].includes(event.id)
                      ? 'schedule-round'
                      : undefined
                  }
                >
                  <span className="schedule-time">{event.time}</span>
                  <span>{t(`schedule.events.${event.id}`)}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
