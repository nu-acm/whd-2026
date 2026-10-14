import type { IconType } from 'react-icons';

export type DateStat = {
  id: string;
  icon: IconType;
  value: string;
  label: string;
  accent: 'pink' | 'purple' | 'lime';
};

const DATE_CLASSES = {
  pink: 'date-stat date-stat-pink',
  purple: 'date-stat date-stat-purple',
  lime: 'date-stat date-stat-lime',
} as const;

/** Watermelon stats-3 compact metrics, adapted to the WHD event dates.
 * Source: https://registry.watermelon.sh/r/stats-3.json
 */
export default function Stats3({ title, dates }: { title: string; dates: DateStat[] }) {
  return (
    <section
      id="timeline"
      className="landing-section landing-container date-stats"
      aria-labelledby="timeline-title"
    >
      <h2 id="timeline-title" className="landing-heading">
        <span>{title}</span>
      </h2>
      <ol className="date-stats-list">
        {dates.map((date) => (
          <li key={date.id} className={DATE_CLASSES[date.accent]}>
            <span className="date-stat-shine" aria-hidden="true" />
            <date.icon className="date-stat-icon" aria-hidden="true" />
            <p className="date-stat-value">{date.value}</p>
            <h3 className="date-stat-label">{date.label}</h3>
          </li>
        ))}
      </ol>
    </section>
  );
}
