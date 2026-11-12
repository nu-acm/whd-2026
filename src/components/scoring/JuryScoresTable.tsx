import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from '@/components/ui/table';
import { Field, FieldLabel } from '@/components/ui/field';
import { ScoreInput } from '@/components/scoring/ScoreInput';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverTitle,
  PopoverDescription,
} from '@/components/ui/popover';
import { MAX_JURY_COMMENT_LENGTH, PRODUCT_CRITERIA } from '@/lib/scoring';
import { formatTeamNumber } from '@/lib/contest';

type JuryTeam = {
  id: string;
  name: string;
  number: number;
  scores: number[] | null;
  comment: string;
};

export function JuryScoresTable({
  teams,
  disabled,
  onSubmit,
}: {
  teams: JuryTeam[];
  disabled: boolean;
  onSubmit: (teamId: string, scores: number[], comment: string) => void;
}) {
  const { t } = useTranslation();
  const hintId = useId();
  if (!teams.length) return null;
  return (
    <div
      className="scoring-table-scroll jury-scoring-table"
      role="region"
      aria-label={t('scoring.juryTitle')}
      tabIndex={0}
    >
      <p id={`${hintId}-comment`} className="sr-only">
        {t('scoring.commentHint', { max: MAX_JURY_COMMENT_LENGTH })}
      </p>
      <Table>
        <caption className="sr-only">{t('scoring.juryTitle')}</caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{t('admin.col.number')}</TableHead>
            <TableHead scope="col">{t('scoring.team')}</TableHead>
            {PRODUCT_CRITERIA.map((criterion) => (
              <TableHead key={criterion.id} id={`${hintId}-${criterion.id}`} scope="col">
                <CriterionHint criterion={criterion} />
              </TableHead>
            ))}
            <TableHead scope="col">{t('scoring.comment')}</TableHead>
            <TableHead scope="col">{t('scoring.jurySum')}</TableHead>
            <TableHead scope="col">
              <span className="sr-only">{t('common.save')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((team) => (
            <TableRow
              key={team.id}
              aria-label={`${t('dashboard.tableNumber', { number: formatTeamNumber(team.number) })} · ${team.name}`}
            >
              <TableCell tone="numeric">{formatTeamNumber(team.number)}</TableCell>
              <TableHead scope="row">
                <span className="scoring-team-name">{team.name}</span>
              </TableHead>
              <ProductScoreCells
                key={JSON.stringify([team.scores, team.comment])}
                team={team}
                hintId={hintId}
                disabled={disabled}
                onSubmit={(scores, comment) => onSubmit(team.id, scores, comment)}
              />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CriterionHint({ criterion }: { criterion: (typeof PRODUCT_CRITERIA)[number] }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        openOnHover
        delay={200}
        onFocus={(event) => {
          if (event.currentTarget.matches(':focus-visible')) setOpen(true);
        }}
        render={<Button variant="table-hint" size="none" />}
      >
        {t(`scoring.criteriaShort.${criterion.id}`)}
        <span className="jury-criterion-max"> / {criterion.max}</span>
      </PopoverTrigger>
      <PopoverContent initialFocus={false} finalFocus={false}>
        <PopoverTitle className="sr-only">
          {t(`scoring.criteriaShort.${criterion.id}`)}
        </PopoverTitle>
        <PopoverDescription>{t(`scoring.criteria.${criterion.id}`)}</PopoverDescription>
      </PopoverContent>
    </Popover>
  );
}

function ProductScoreCells({
  team,
  hintId,
  disabled,
  onSubmit,
}: {
  team: JuryTeam;
  hintId: string;
  disabled: boolean;
  onSubmit: (scores: number[], comment: string) => void;
}) {
  const { t } = useTranslation();
  const formId = useId();
  const [comment, setComment] = useState(team.comment);
  const [values, setValues] = useState(
    PRODUCT_CRITERIA.map((_, i) => team.scores?.[i]?.toString() ?? ''),
  );
  const complete = values.every((value) => value.trim() !== '');
  const total = values.reduce((sum, value) => sum + Number(value), 0);
  const saved =
    complete &&
    team.scores !== null &&
    values.every((value, i) => Number(value) === team.scores?.[i]) &&
    comment.trim() === team.comment;
  return (
    <>
      {PRODUCT_CRITERIA.map((criterion, i) => (
        <TableCell key={criterion.id}>
          <Field data-disabled={disabled || undefined}>
            <FieldLabel className="sr-only" htmlFor={`${formId}-${criterion.id}`}>
              {t(`scoring.criteria.${criterion.id}`)}
            </FieldLabel>
            <ScoreInput
              id={`${formId}-${criterion.id}`}
              name={criterion.id}
              form={formId}
              max={criterion.max}
              required
              aria-describedby={`${hintId}-${criterion.id}`}
              disabled={disabled}
              value={values[i]}
              onValueChange={(next) =>
                setValues((current) => current.map((value, j) => (i === j ? next : value)))
              }
            />
          </Field>
        </TableCell>
      ))}
      <TableCell>
        <Field data-disabled={disabled || undefined}>
          <FieldLabel className="sr-only" htmlFor={`${formId}-comment`}>
            {t('scoring.comment')}
          </FieldLabel>
          <Textarea
            id={`${formId}-comment`}
            name="comment"
            form={formId}
            rows={2}
            maxLength={MAX_JURY_COMMENT_LENGTH}
            aria-describedby={`${hintId}-comment`}
            placeholder={t('scoring.commentPlaceholder')}
            disabled={disabled}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </Field>
      </TableCell>
      <TableCell tone="numeric">
        <output form={formId} aria-label={t('scoring.juryTotal')}>
          {total} / 100
        </output>
      </TableCell>
      <TableCell>
        <form
          id={formId}
          autoComplete="off"
          aria-label={`${t('scoring.product')}: ${team.name}`}
          onSubmit={(event) => {
            event.preventDefault();
            if (!disabled && complete && !saved) onSubmit(values.map(Number), comment);
          }}
        >
          <Button
            type="submit"
            size="sm"
            variant={saved ? 'secondary' : 'default'}
            disabled={disabled || !complete || saved}
          >
            {t(saved ? 'scoring.rowSaved' : 'common.save')}
          </Button>
        </form>
      </TableCell>
    </>
  );
}
