import type { ReactNode } from 'react';

export interface Cta4Props {
  title: ReactNode;
  subtitle: ReactNode;
  action: ReactNode;
  visual: ReactNode;
}

// Adapted from https://registry.watermelon.sh/r/cta-4.json.
export function Cta4({ title, subtitle, action, visual }: Cta4Props) {
  return (
    <div className="cta-four">
      <div className="cta-four-copy">
        <h2 id="closing-cta-title" className="landing-heading">
          {title}
        </h2>
        <p className="cta-four-subtitle">{subtitle}</p>
        {action}
      </div>
      <div className="cta-four-visual">{visual}</div>
    </div>
  );
}
