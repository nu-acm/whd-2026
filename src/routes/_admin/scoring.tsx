import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { TeamScoresTable } from '@/components/scoring/TeamScoresTable';
import { useScoringAction } from '@/components/scoring/use-scoring-action';
import { distributionSchema, roundScoresSchema } from '@/lib/scoring';
import { loadScoringAdmin, saveRoundScores, distributeJurors } from '@/lib/scoring.server';

const load = createServerFn({ method: 'GET' }).handler(() => loadScoringAdmin(getRequest()));
const save = createServerFn({ method: 'POST' })
  .validator(roundScoresSchema)
  .handler(({ data }) => saveRoundScores(getRequest(), data));
const distribute = createServerFn({ method: 'POST' })
  .validator(distributionSchema)
  .handler(({ data }) => distributeJurors(getRequest(), data));

export const Route = createFileRoute('/_admin/scoring')({
  loader: () => load(),
  staleTime: 0,
  component: ScoringPage,
});

function ScoringPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const data = Route.useLoaderData();
  const { pending, feedback, run } = useScoringAction();
  const [confirmDistribution, setConfirmDistribution] = useState(false);
  const disabled = pending || data.published;
  const scoringStarted = data.teams.some(
    (team) => team.assessment !== null && team.assessment.scores !== null,
  );
  const distributeTeams = () =>
    void run(() => distribute({ data: { revision: data.revision } }), 'scoring.distributed');
  return (
    <main className="scoring-main">
      <div>
        <h1 className="scoring-heading">{t('scoring.adminTitle')}</h1>
        <p className="scoring-description">{t('scoring.adminHint')}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => void run(() => router.invalidate(), 'scoring.refreshed')}
        >
          {t('admin.refresh')}
        </Button>
      </div>
      {feedback && (
        <p className="scoring-feedback" role={feedback.error ? 'alert' : 'status'}>
          {t(feedback.key)}
        </p>
      )}
      {data.published && <Notice>{t('scoring.publishedLocked')}</Notice>}
      <Card>
        <CardHeader>
          <CardTitle>{t('scoring.roundScores')}</CardTitle>
          <CardDescription>{t('scoring.distributionHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Button
              disabled={disabled || scoringStarted || !data.teams.length || !data.juryEmails.length}
              onClick={() => {
                if (data.teams.some((team) => team.assessment !== null))
                  setConfirmDistribution(true);
                else distributeTeams();
              }}
            >
              {t('scoring.distribute')}
            </Button>
          </div>
          {scoringStarted && <Notice>{t('scoring.distributionLocked')}</Notice>}
          <ConfirmDialog
            open={confirmDistribution}
            onOpenChange={setConfirmDistribution}
            title={t('scoring.redistributeTitle')}
            description={t('scoring.redistributeBody')}
            confirmLabel={t('scoring.distribute')}
            cancelLabel={t('common.cancel')}
            onConfirm={distributeTeams}
          />
          <TeamScoresTable
            teams={data.teams}
            disabled={disabled}
            onSave={(teamId, icpc, math) => void run(() => save({ data: { teamId, icpc, math } }))}
          />
        </CardContent>
      </Card>
    </main>
  );
}
