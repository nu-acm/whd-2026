import { useId, useState } from 'react';
import { Field, FieldLabel } from '@/components/ui/field';
import { ScoreInput } from '@/components/scoring/ScoreInput';
import { Button } from '@/components/ui/button';
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
import { PRODUCT_CRITERIA, ROUND_MAX, type ScoringTeam } from '@/lib/scoring';

export function TeamScoresTable({
  teams,
  disabled,
  onSave,
}: {
  teams: ScoringTeam[];
  disabled: boolean;
  onSave: (teamId: string, icpc: number | null, math: number | null) => void;
}) {
  const { t } = useTranslation();
  const hintId = useId();
  if (!teams.length)
    return (
      <Empty>
        <EmptyDescription>{t('scoring.noTeams')}</EmptyDescription>
      </Empty>
    );
  return (
    <>
      <p id={hintId} className="scoring-table-hint">
        {t('scoring.roundScoreHint', ROUND_MAX)}
      </p>
      <div
        className="scoring-table-scroll scoring-entry-table"
        role="region"
        aria-label={t('scoring.roundScores')}
        tabIndex={0}
      >
        <Table>
          <caption className="sr-only">{t('scoring.roundScores')}</caption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{t('admin.col.number')}</TableHead>
              <TableHead scope="col">{t('scoring.team')}</TableHead>
              <TableHead scope="col">
                {t('scoring.icpc')} / {ROUND_MAX.icpc}
              </TableHead>
              <TableHead scope="col">
                {t('scoring.math')} / {ROUND_MAX.math}
              </TableHead>
              <TableHead scope="col">
                <span className="sr-only">{t('scoring.saveRoundScores')}</span>
              </TableHead>
              <TableHead scope="col">{t('scoring.assignedJury')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team) => (
              <TeamScoreRow
                key={`${team.id}:${team.icpc}:${team.math}`}
                team={team}
                hintId={hintId}
                disabled={disabled}
                onSave={(icpc, math) => onSave(team.id, icpc, math)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function TeamScoreRow({
  team,
  hintId,
  disabled,
  onSave,
}: {
  team: ScoringTeam;
  hintId: string;
  disabled: boolean;
  onSave: (icpc: number | null, math: number | null) => void;
}) {
  const { t } = useTranslation();
  const assessment = team.assessment;
  const title = `${t('dashboard.tableNumber', { number: formatTeamNumber(team.number) })} · ${team.name}`;
  return (
    <TableRow aria-label={title}>
      <TableCell tone="numeric">{formatTeamNumber(team.number)}</TableCell>
      <TableHead scope="row">
        <span className="scoring-team-name">{team.name}</span>
      </TableHead>
      <RoundScoreCells team={team} hintId={hintId} disabled={disabled} onSave={onSave} />
      <TableCell>
        <div className="scoring-jurors">
          {assessment === null ? (
            <p>{t('scoring.unassigned')}</p>
          ) : (
            <div>
              <p>
                {assessment.jurorEmail} ·{' '}
                {t(assessment.scores ? 'scoring.submitted' : 'scoring.pending')}
              </p>
              {assessment.scores && (
                <details className="scoring-assessment">
                  <summary>
                    {assessment.scores.reduce((sum, score) => sum + score, 0)} / 100
                  </summary>
                  <dl className="scoring-criteria-summary">
                    {PRODUCT_CRITERIA.map((criterion, i) => (
                      <div key={criterion.id}>
                        <dt>{t(`scoring.criteria.${criterion.id}`)}</dt>
                        <dd>
                          {assessment.scores?.[i]} / {criterion.max}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </details>
              )}
              {assessment.comment && (
                <p className="scoring-jury-comment">
                  <strong>{t('scoring.comment')}: </strong>
                  {assessment.comment}
                </p>
              )}
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function RoundScoreCells({
  team,
  hintId,
  disabled,
  onSave,
}: {
  team: ScoringTeam;
  hintId: string;
  disabled: boolean;
  onSave: (icpc: number | null, math: number | null) => void;
}) {
  const { t } = useTranslation();
  const formId = useId();
  const [icpc, setIcpc] = useState(team.icpc?.toString() ?? '');
  const [math, setMath] = useState(team.math?.toString() ?? '');
  return (
    <>
      {(
        [
          { key: 'icpc', value: icpc, set: setIcpc },
          { key: 'math', value: math, set: setMath },
        ] as const
      ).map((round) => (
        <TableCell key={round.key}>
          <Field data-disabled={disabled || undefined}>
            <FieldLabel className="sr-only" htmlFor={`${formId}-${round.key}`}>
              {t(`scoring.${round.key}`)}
            </FieldLabel>
            <ScoreInput
              id={`${formId}-${round.key}`}
              name={round.key}
              form={formId}
              max={ROUND_MAX[round.key]}
              aria-describedby={hintId}
              disabled={disabled}
              value={round.value}
              onValueChange={round.set}
            />
          </Field>
        </TableCell>
      ))}
      <TableCell>
        <form
          id={formId}
          autoComplete="off"
          aria-label={`${t('scoring.roundScores')}: ${team.name}`}
          onSubmit={(event) => {
            event.preventDefault();
            onSave(
              icpc.trim() === '' ? null : Number(icpc),
              math.trim() === '' ? null : Number(math),
            );
          }}
        >
          <Button
            type="submit"
            size="sm"
            disabled={disabled}
            aria-label={t('scoring.saveRoundScores')}
          >
            {t('common.save')}
          </Button>
        </form>
      </TableCell>
    </>
  );
}
