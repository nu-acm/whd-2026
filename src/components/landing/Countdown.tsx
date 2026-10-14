import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function getTimeLeft(target: number): TimeLeft | null {
  const difference = target - Date.now();
  if (difference <= 0) return null;

  return {
    days: Math.floor(difference / DAY),
    hours: Math.floor((difference % DAY) / HOUR),
    minutes: Math.floor((difference % HOUR) / MINUTE),
    seconds: Math.floor((difference % MINUTE) / SECOND),
  };
}

/** Russian needs three plural forms; English needs two; Kazakh needs one. */
function russianPlural(n: number, one: string, few: string, many: string): string {
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (lastDigit === 1) return one;
  if (lastDigit >= 2 && lastDigit <= 4) return few;
  return many;
}

/** Counts down to `deadline` (an ISO instant); calls `onElapsed` once it passes. */
export default function Countdown({
  deadline,
  onElapsed,
}: {
  deadline: string;
  onElapsed?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const target = new Date(deadline).getTime();

  // Seeded as null rather than from Date.now(): the server and the client would
  // compute different values and React would flag a hydration mismatch. The
  // first tick fills it in immediately after mount.
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [hasElapsed, setHasElapsed] = useState(false);

  useEffect(() => {
    const tick = () => {
      const next = getTimeLeft(target);
      setTimeLeft(next);
      setHasElapsed(next === null);
      if (next === null) onElapsed?.();
    };

    tick();
    const timer = setInterval(tick, SECOND);
    return () => clearInterval(timer);
    // onElapsed is a fire-once notification; re-subscribing on every render is not needed.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [target]);

  const language = i18n.resolvedLanguage ?? i18n.language;

  const pluralize = (n: number, unit: 'days' | 'hours'): string => {
    if (language === 'ru') {
      return russianPlural(
        n,
        t(`countdown.${unit}_one`),
        t(`countdown.${unit}_few`),
        t(`countdown.${unit}`),
      );
    }
    if (language === 'en') {
      return n === 1 ? t(`countdown.${unit}_one`) : t(`countdown.${unit}`);
    }
    return t(`countdown.${unit}`);
  };

  // Once the deadline passes there is nothing to count down to, so the label
  // goes with it — "Registration closes in / Registration is closed" would read
  // as a contradiction.
  if (hasElapsed) {
    return <></>;
  }

  const units = timeLeft
    ? [
        { value: timeLeft.days, label: pluralize(timeLeft.days, 'days') },
        { value: timeLeft.hours, label: pluralize(timeLeft.hours, 'hours') },
        { value: timeLeft.minutes, label: t('countdown.minutes') },
        { value: timeLeft.seconds, label: t('countdown.seconds') },
      ]
    : [
        { value: null, label: t('countdown.days') },
        { value: null, label: t('countdown.hours') },
        { value: null, label: t('countdown.minutes') },
        { value: null, label: t('countdown.seconds') },
      ];

  return (
    <div className="landing-countdown">
      <p>{t('hero.countdownLabel')}</p>
      <dl>
        {units.map((unit, index) => (
          <div key={index}>
            <dd>{unit.value === null ? '--' : String(unit.value).padStart(2, '0')}</dd>
            <dt>{unit.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}
