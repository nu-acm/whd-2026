import { useTranslation } from 'react-i18next';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { AccountShell } from '@/components/AccountShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyDescription } from '@/components/ui/empty';
import { ROUND_MAX } from '@/lib/scoring';
import { RankingsTable } from '@/components/scoring/RankingsTable';
import { getPublishedResults } from '@/lib/scoring.server';

const load = createServerFn({ method: 'GET' }).handler(() => getPublishedResults());

export const Route = createFileRoute('/results')({
  loader: () => load(),
  staleTime: 0,
  component: ResultsPage,
});

function ResultsPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const data = Route.useLoaderData();
  return (
    <AccountShell>
      <main className="scoring-main">
        <div>
          <h1 className="scoring-heading">{t('scoring.resultsTitle')}</h1>
          <p className="scoring-description">{t('scoring.formula', ROUND_MAX)}</p>
          <p className="scoring-description">{t('scoring.sharedRanks')}</p>
          <p className="scoring-description">{t('scoring.rounding')}</p>
          {data && (
            <p className="scoring-description">
              {t('scoring.publishedAt', {
                date: new Date(data.publishedAt).toLocaleString(i18n.language, {
                  timeZone: 'Asia/Almaty',
                }),
              })}
            </p>
          )}
        </div>
        <div>
          <Button variant="secondary" onClick={() => void router.invalidate()}>
            {t('admin.refresh')}
          </Button>
        </div>
        {data ? (
          <Card>
            <CardContent>
              <RankingsTable rows={data.rows} />
            </CardContent>
          </Card>
        ) : (
          <Empty>
            <EmptyDescription>{t('scoring.notPublished')}</EmptyDescription>
          </Empty>
        )}
      </main>
    </AccountShell>
  );
}
