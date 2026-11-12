import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { Button, LinkButton } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ROUND_MAX } from '@/lib/scoring';
import { RankingsTable } from '@/components/scoring/RankingsTable';
import { useScoringAction } from '@/components/scoring/use-scoring-action';
import { loadScoringAdmin, publishResults, unpublishResults } from '@/lib/scoring.server';

const load = createServerFn({ method: 'GET' }).handler(() => loadScoringAdmin(getRequest()));
const publish = createServerFn({ method: 'POST' }).handler(() => publishResults(getRequest()));
const unpublish = createServerFn({ method: 'POST' }).handler(() => unpublishResults(getRequest()));

export const Route = createFileRoute('/_admin/rankings')({
  loader: () => load(),
  staleTime: 0,
  component: RankingsPage,
});

function RankingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const data = Route.useLoaderData();
  const { pending, feedback, run } = useScoringAction();
  const [confirmation, setConfirmation] = useState<'publish' | 'unpublish' | null>(null);
  const complete = data.rankings.length > 0 && data.rankings.every((row) => row.total !== null);
  return (
    <main className="scoring-main">
      <div>
        <h1 className="scoring-heading">{t('scoring.rankings')}</h1>
        <p className="scoring-description">{t('scoring.formula', ROUND_MAX)}</p>
        <p className="scoring-description">{t('scoring.sharedRanks')}</p>
        <p className="scoring-description">{t('scoring.rounding')}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => void run(() => router.invalidate(), 'scoring.refreshed')}
        >
          {t('admin.refresh')}
        </Button>
        <LinkButton href="/results" variant="secondary">
          {t('scoring.viewResults')}
        </LinkButton>
        <Button
          disabled={pending || (!data.published && !complete)}
          onClick={() => setConfirmation(data.published ? 'unpublish' : 'publish')}
        >
          {t(data.published ? 'scoring.unpublish' : 'scoring.publish')}
        </Button>
      </div>
      {feedback && (
        <p className="scoring-feedback" role={feedback.error ? 'alert' : 'status'}>
          {t(feedback.key)}
        </p>
      )}
      {data.published && <Notice>{t('scoring.publishedLocked')}</Notice>}
      {!data.published && !complete && <Notice>{t('scoring.completeness')}</Notice>}
      <Card>
        <CardContent>
          <RankingsTable rows={data.rankings} progress />
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
        title={t(confirmation === 'unpublish' ? 'scoring.unpublish' : 'scoring.publish')}
        description={t(
          confirmation === 'unpublish' ? 'scoring.unpublishBody' : 'scoring.publishBody',
        )}
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={() =>
          void run(
            () => (confirmation === 'unpublish' ? unpublish() : publish()),
            confirmation === 'unpublish' ? 'scoring.unpublished' : 'scoring.published',
          )
        }
      />
    </main>
  );
}
