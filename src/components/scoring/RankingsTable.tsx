import { useTranslation } from 'react-i18next';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from '@/components/ui/table';
import { Empty, EmptyDescription } from '@/components/ui/empty';
import { formatTeamNumber } from '@/lib/contest';
import { ROUND_MAX, type RankedTeam } from '@/lib/scoring';

export function RankingsTable({
  rows,
  progress = false,
}: {
  rows: RankedTeam[];
  progress?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const number = (value: number | null) =>
    value === null
      ? t('scoring.pending')
      : value.toLocaleString(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (!rows.length)
    return (
      <Empty>
        <EmptyDescription>{t('scoring.noTeams')}</EmptyDescription>
      </Empty>
    );
  return (
    <div
      className="scoring-table-scroll"
      role="region"
      aria-label={t('scoring.rankings')}
      tabIndex={0}
    >
      <Table>
        <caption className="sr-only">{t('scoring.rankings')}</caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{t('scoring.rank')}</TableHead>
            <TableHead scope="col">{t('scoring.team')}</TableHead>
            <TableHead scope="col">
              {t('scoring.icpc')} / {ROUND_MAX.icpc} (30%)
            </TableHead>
            <TableHead scope="col">
              {t('scoring.math')} / {ROUND_MAX.math} (30%)
            </TableHead>
            <TableHead scope="col">
              {t('scoring.product')} / {ROUND_MAX.product} (40%)
            </TableHead>
            <TableHead scope="col">{t('scoring.total')}</TableHead>
            {progress && <TableHead scope="col">{t('scoring.juryProgress')}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell tone="numeric">{row.rank ?? t('scoring.pending')}</TableCell>
              <TableCell>
                {formatTeamNumber(row.number)} · {row.name}
              </TableCell>
              <TableCell tone="numeric">{number(row.icpc)}</TableCell>
              <TableCell tone="numeric">{number(row.math)}</TableCell>
              <TableCell tone="numeric">{number(row.product)}</TableCell>
              <TableCell tone="numeric">{number(row.total)}</TableCell>
              {progress && (
                <TableCell>
                  {row.submitted} / {row.assigned}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
