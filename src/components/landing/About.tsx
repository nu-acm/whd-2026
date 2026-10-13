import { useTranslation } from 'react-i18next';
import { FaCalculator, FaCode, FaPenRuler } from 'react-icons/fa6';
import Features2 from '@/components/ui/feature-2';
import { EVENT_SCHEDULE } from '@/lib/event';
import { parseTextWithLinks } from '@/lib/text';

const ROUND_ICONS = { mathematics: FaCalculator, programming: FaCode, productDesign: FaPenRuler };
const ROUNDS = ['mathematics', 'programming', 'productDesign'] as const;
const QUESTIONS = ['professional', 'noTeam'] as const;

export default function About() {
  const { t } = useTranslation();
  return (
    <Features2
      eyebrow={`${t('about.editionOrdinal')} ${t('about.annualEdition')}`}
      title={
        <>
          {t('about.title')}
          <br />
          <span>{t('about.titleHighlight')}</span>
        </>
      }
      description={parseTextWithLinks(t('about.description'))}
      questions={QUESTIONS.map((id) => ({
        id,
        title: t(`faq.questions.${id}.q`),
        answer: parseTextWithLinks(t(`faq.questions.${id}.a`)),
      }))}
      rounds={ROUNDS.map((id) => ({
        id,
        title: t(`schedule.events.${id}`),
        icon: ROUND_ICONS[id],
        time: EVENT_SCHEDULE.find((event) => event.id === id)!.time,
      }))}
      roundsLabel={`${t('about.roundsCount')} ${t('about.rounds')}`}
      actionLabel={t('navbar.schedule')}
      footer={t('about.organizers')}
    />
  );
}
