import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Watermelon bento-02: alternating 2+1 / 1+2 cards, with WHD content.
 * Source: https://registry.watermelon.sh/r/bento-02.json
 */
export default function Bento2({
  prize,
  welcome,
  experience,
  partners,
  className,
}: {
  prize: ReactNode;
  welcome: ReactNode;
  experience: ReactNode;
  partners: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('whd-bento', className)}>
      <div className="whd-bento-card whd-bento-prize">{prize}</div>
      <div className="whd-bento-card whd-bento-welcome">{welcome}</div>
      <div className="whd-bento-card whd-bento-experience">{experience}</div>
      <div className="whd-bento-card whd-bento-partners">{partners}</div>
    </div>
  );
}
