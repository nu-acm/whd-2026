import { useTranslation } from 'react-i18next';
import { ArrowUpRight } from 'lucide-react';
import { Faq6 } from '@/components/ui/faq-06';
import { parseTextWithLinks } from '@/lib/text';
import { TELEGRAM_CHAT_URL } from '@/lib/event';

const QUESTIONS = [
  'whoCanParticipate',
  'professional',
  'noTeam',
  'howToParticipate',
  'whatIs',
  'organizers',
  'otherEvents',
  'online',
  'certificates',
  'noAnswer',
] as const;

export default function FAQ() {
  const { t } = useTranslation();
  return (
    <section id="faq" className="landing-section landing-container" aria-labelledby="faq-title">
      <Faq6
        badge={t('faq.kicker')}
        title={t('faq.title')}
        titleId="faq-title"
        faqs={QUESTIONS.map((key) => ({
          id: key,
          question: t(`faq.questions.${key}.q`),
          answer: parseTextWithLinks(t(`faq.questions.${key}.a`)),
        }))}
        contact={
          <a
            href={TELEGRAM_CHAT_URL}
            className="faq-contact"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('faq.chatLink')}
            <ArrowUpRight size={18} aria-hidden="true" />
          </a>
        }
      />
    </section>
  );
}
