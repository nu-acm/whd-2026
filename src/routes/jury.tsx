import { useTranslation } from 'react-i18next';
import { createFileRoute, notFound, redirect, useRouter } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { AccountShell } from '@/components/AccountShell';
import { Notice } from '@/components/ui/notice';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription } from '@/components/ui/empty';
import { JuryScoresTable } from '@/components/scoring/JuryScoresTable';
import { useScoringAction } from '@/components/scoring/use-scoring-action';
import { getSession } from '@/lib/auth.server';
import { sessionIsJury } from '@/lib/jury.server';
import { juryScoresSchema } from '@/lib/scoring';
import { loadJury, submitJuryScores } from '@/lib/scoring.server';

const access = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getSession(getRequest());
  return !session ? 'anonymous' : sessionIsJury(session) ? 'jury' : 'forbidden';
});
const load = createServerFn({ method: 'GET' }).handler(() => loadJury(getRequest()));
const submit = createServerFn({ method: 'POST' })
  .validator(juryScoresSchema)
  .handler(({ data }) => submitJuryScores(getRequest(), data));

export const Route = createFileRoute('/jury')({
  beforeLoad: async () => {
    const state = await access();
    if (state === 'anonymous') throw redirect({ to: '/login' });
    if (state !== 'jury') throw notFound();
  },
  loader: () => load(),
  staleTime: 0,
  component: JuryPage,
});

function JuryPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const data = Route.useLoaderData();
  const { pending, feedback, run } = useScoringAction();
  return (
    <AccountShell email={data.juror.email}>
      <main className="scoring-main">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="scoring-heading">{t('scoring.juryTitle')}</h1>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => void run(() => router.invalidate(), 'scoring.refreshed')}
          >
            {t('admin.refresh')}
          </Button>
        </div>
        {feedback && (
          <p
            className={feedback.error ? 'scoring-feedback' : 'sr-only'}
            role={feedback.error ? 'alert' : 'status'}
          >
            {t(feedback.key)}
          </p>
        )}
        {data.published && <Notice>{t('scoring.juryLocked')}</Notice>}
        {!data.teams.length && (
          <Empty>
            <EmptyDescription>{t('scoring.noAssignments')}</EmptyDescription>
          </Empty>
        )}
        <JuryScoresTable
          teams={data.teams}
          disabled={pending || data.published}
          onSubmit={(teamId, scores, comment) =>
            void run(() => submit({ data: { teamId, scores, comment } }))
          }
        />
      </main>
    </AccountShell>
  );
}
