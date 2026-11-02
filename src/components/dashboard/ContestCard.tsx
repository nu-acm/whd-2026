import { ArrowUpRight, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useId, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { LinkButton } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import type { ContestAccess } from '@/lib/contest';

const everyFewSeconds = (onChange: () => void) => {
  const id = setInterval(onChange, 5000);
  return () => clearInterval(id);
};

/** True from `start` on, without a reload. The server renders false; the browser catches up. */
function useStarted(start: string | null) {
  return useSyncExternalStore(
    everyFewSeconds,
    () => start !== null && Date.now() >= Date.parse(start),
    () => false,
  );
}

/**
 * A finalized team's table number and Codeforces account. Every member sees it from the moment
 * the teams are finalized, for good; the upload button joins it at the contest start.
 */
export function ContestCard({ contest }: { contest: ContestAccess }) {
  const { t } = useTranslation();
  const [shown, setShown] = useState(false);
  const loginId = useId();
  const passwordId = useId();
  const started = useStarted(contest.contestStart);

  return (
    <Card variant="team">
      <CardHeader variant="team">
        <p className="account-eyebrow">
          <KeyRound size={16} aria-hidden="true" />
          {t('dashboard.contestEyebrow')}
        </p>
        <CardTitle variant="team">
          {t('dashboard.tableNumber', { number: contest.tableNumber })}
        </CardTitle>
        <CardDescription variant="account">{t('dashboard.contestHint')}</CardDescription>
      </CardHeader>
      <CardContent variant="team">
        <Field>
          <FieldLabel htmlFor={loginId}>{t('dashboard.cfLogin')}</FieldLabel>
          <Input
            id={loginId}
            readOnly
            value={contest.login}
            onFocus={(e) => e.currentTarget.select()}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={passwordId}>{t('dashboard.cfPassword')}</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id={passwordId}
              readOnly
              type={shown ? 'text' : 'password'}
              autoComplete="off"
              value={contest.password}
              onFocus={(e) => e.currentTarget.select()}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                onClick={() => setShown((value) => !value)}
                aria-label={t('dashboard.showPassword')}
                aria-pressed={shown}
                title={t('dashboard.showPassword')}
              >
                {shown ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Field>
        {started && (
          <LinkButton href={contest.uploadUrl} target="_blank" rel="noopener noreferrer">
            <span>{t('dashboard.uploadVideo')}</span>
            <ArrowUpRight className="account-button-arrow" aria-hidden="true" />
          </LinkButton>
        )}
      </CardContent>
    </Card>
  );
}
