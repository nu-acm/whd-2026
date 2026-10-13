import type { ReactNode } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { FaPlus, FaMinus } from 'react-icons/fa';
import { cn } from '@/lib/utils';

export interface FaqItem {
  id: string;
  question: string;
  answer: ReactNode;
}

export interface Faq6Props {
  badge?: string;
  title: ReactNode;
  titleId?: string;
  faqs: FaqItem[];
  contact?: ReactNode;
  className?: string;
}

// Adapted from https://registry.watermelon.sh/r/faq-6.json.
export function Faq6({ badge, title, titleId, faqs, contact, className }: Faq6Props) {
  return (
    <div className={cn('faq-six', className)}>
      <div className="faq-six-intro">
        {badge && <p className="landing-eyebrow">{badge}</p>}
        <h2 id={titleId} className="landing-heading">
          {title}
        </h2>
        {contact}
      </div>
      <Accordion type="single" collapsible className="faq-six-list">
        {faqs.map((faq, index) => (
          <AccordionItem key={faq.id} value={faq.id} className="faq-six-item">
            <AccordionTrigger className="faq-six-trigger">
              <span className="faq-six-number" aria-hidden="true">
                Q{index + 1}
              </span>
              <span className="faq-six-question">{faq.question}</span>
              <span className="faq-six-toggle" aria-hidden="true">
                <FaPlus className="faq-six-plus" />
                <FaMinus className="faq-six-minus" />
              </span>
            </AccordionTrigger>
            <AccordionContent className="faq-six-answer">
              <p>{faq.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
