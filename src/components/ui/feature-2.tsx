import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { Card, CardContent } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export type FeatureRound = {
  id: string;
  title: string;
  time: string;
  icon: IconType;
};

type Features2Props = {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  questions: { id: string; title: string; answer: ReactNode }[];
  rounds: FeatureRound[];
  roundsLabel: string;
  actionLabel: string;
  footer: ReactNode;
};

/** Watermelon feature-2: split introduction and staggered cards, adapted for WHD.
 * Source: https://registry.watermelon.sh/r/feature-2.json
 */
export default function Features2({
  eyebrow,
  title,
  description,
  questions,
  rounds,
  roundsLabel,
  actionLabel,
  footer,
}: Features2Props) {
  return (
    <section
      id="about"
      className="landing-section landing-container feature-two"
      aria-labelledby="about-title"
    >
      <div className="feature-two-layout">
        <div className="feature-two-copy">
          <p className="landing-eyebrow">{eyebrow}</p>
          <h2 id="about-title" className="landing-heading">
            {title}
          </h2>
          <p className="landing-copy">{description}</p>
          <Accordion type="single" collapsible className="feature-two-questions">
            {questions.map((question) => (
              <AccordionItem key={question.id} value={question.id} className="feature-two-question">
                <AccordionTrigger className="feature-two-trigger">
                  {question.title}
                </AccordionTrigger>
                <AccordionContent className="feature-two-answer">
                  {question.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <LinkButton href="#schedule" className="feature-two-action">
            {actionLabel}
            <span aria-hidden="true">↗</span>
          </LinkButton>
        </div>
        <div className="feature-two-visual">
          <ol className="feature-two-rounds" aria-label={roundsLabel}>
            {rounds.map((round, index) => (
              <li key={round.id} className={`feature-two-round feature-two-round-${index + 1}`}>
                <Card className="feature-two-card">
                  <CardContent className="feature-two-card-content">
                    <div className="feature-two-card-top">
                      <round.icon aria-hidden="true" />
                      <span className="feature-two-number" aria-hidden="true">
                        0{index + 1}
                      </span>
                    </div>
                    <h3>{round.title}</h3>
                    <p className="feature-two-time">{round.time}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <p className="about-organizers">{footer}</p>
    </section>
  );
}
