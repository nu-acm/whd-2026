import { Users, Sparkles, Square, ArrowUpRight, Link as LinkIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebHaptics } from 'web-haptics/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardContent } from '@/components/ui/card';
import { createTeamSchema, inviteSlugSchema } from '@/lib/validation';
import { webHapticsOptions } from '@/lib/web-haptics';
import { AI_COOLDOWN_MS } from '@/lib/ai';

/** Pause after each generation (and a shorter one after cancelling) to spare Workers AI. */
const CANCEL_COOLDOWN_MS = 3000;

/** Seconds left until `until`, ticking while a cooldown is running. */
function useCountdown(until: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until <= Date.now()) return;
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= until) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [until]);
  return Math.max(0, Math.ceil((until - now) / 1000));
}

/** Shown when a participant has no team: create one, or join with a code. */
export function NoTeamCard({
  registrationOpen,
  onCreate,
  onJoin,
  onGenerate,
}: {
  registrationOpen: boolean;
  onCreate: (name: string) => Promise<void>;
  onJoin: (slug: string) => Promise<void>;
  /** Asks the AI for a team name suggestion. */
  onGenerate: () => Promise<string>;
}) {
  const { t } = useTranslation();
  const { trigger } = useWebHaptics(webHapticsOptions);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const cooldownSeconds = useCountdown(cooldownUntil);
  // Each generation gets an id; cancelling bumps it so a late reply is ignored.
  const generationRef = useRef(0);

  const fail = (setError: (m: string) => void, message: string) => {
    trigger('error');
    setError(message);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    const parsed = createTeamSchema.safeParse({ name });
    if (!parsed.success) return fail(setNameError, parsed.error.issues[0].message);
    setPending(true);
    try {
      await onCreate(parsed.data.name);
    } catch (err) {
      // Server errors may be i18n keys (registration closed); t() passes plain text through.
      fail(setNameError, err instanceof Error ? err.message : 'dashboard.actionFailed');
    } finally {
      setPending(false);
    }
  };

  const submitJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlugError(null);
    // Accept a full invite URL as well as a bare code.
    const cleaned = slug.trim().replace(/^.*\/invite\//, '');
    const parsed = inviteSlugSchema.safeParse({ slug: cleaned });
    if (!parsed.success) return fail(setSlugError, parsed.error.issues[0].message);
    setPending(true);
    try {
      await onJoin(parsed.data.slug);
    } catch (err) {
      fail(setSlugError, err instanceof Error ? err.message : 'dashboard.actionFailed');
    } finally {
      setPending(false);
    }
  };

  const generate = async () => {
    const id = ++generationRef.current;
    setNameError(null);
    setGenerating(true);
    setCooldownUntil(Date.now() + AI_COOLDOWN_MS);
    try {
      const suggestion = await onGenerate();
      if (id !== generationRef.current) return;
      setName(suggestion);
      trigger('success');
    } catch (err) {
      if (id !== generationRef.current) return;
      fail(setNameError, err instanceof Error ? err.message : 'dashboard.generateFailed');
    } finally {
      if (id === generationRef.current) setGenerating(false);
    }
  };

  const cancelGenerate = () => {
    generationRef.current++;
    setGenerating(false);
    setCooldownUntil(Date.now() + CANCEL_COOLDOWN_MS);
  };

  const generateLabel = generating
    ? t('dashboard.cancelGenerate')
    : cooldownSeconds > 0
      ? t('dashboard.generateCooldown', { seconds: cooldownSeconds })
      : t('dashboard.generateName');

  if (!registrationOpen) {
    return (
      <Card className="account-team-card">
        <CardContent className="account-no-team-content">
          <Users className="account-section-icon" aria-hidden="true" />
          <h2>{t('dashboard.noTeam')}</h2>
          <p className="mt-3 text-sm text-amber-200">{t('dashboard.registrationClosedNoTeam')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="account-team-card">
      <CardContent className="account-no-team-content">
        <div>
          <Users className="account-section-icon" aria-hidden="true" />
          <h2>{t('dashboard.noTeam')}</h2>
          <p className="text-whd-text-muted mt-2 text-sm leading-relaxed">
            {t('dashboard.noTeamHint')}
          </p>
        </div>

        <div className="account-team-forms">
          <form onSubmit={submitCreate} className="account-team-form" noValidate>
            <h3>{t('dashboard.newTeamTitle')}</h3>
            <Field
              label={t('dashboard.teamNameLabel')}
              error={nameError ? t(nameError) : undefined}
            >
              {(p) => (
                <div className="relative">
                  <Input
                    {...p}
                    value={name}
                    placeholder={t('dashboard.teamNamePlaceholder')}
                    onChange={(e) => setName(e.target.value)}
                    disabled={pending || generating}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={generating ? cancelGenerate : generate}
                    disabled={pending || (!generating && cooldownSeconds > 0)}
                    aria-label={generateLabel}
                    title={generateLabel}
                    className="text-whd-pink-soft hover:text-whd-pink-bright absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-lg transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {generating ? (
                      <Square size={16} aria-hidden="true" />
                    ) : (
                      <Sparkles size={18} aria-hidden="true" />
                    )}
                  </button>
                </div>
              )}
            </Field>
            {generating && (
              <p className="text-whd-text-muted -mt-1 text-sm" aria-live="polite">
                {t('dashboard.generating')}
              </p>
            )}
            <Button type="submit" disabled={pending || generating}>
              <span>{t('dashboard.createTeam')}</span>
              <ArrowUpRight className="account-button-arrow" aria-hidden="true" />
            </Button>
          </form>

          <form onSubmit={submitJoin} className="account-team-form account-join-form" noValidate>
            <h3>{t('dashboard.invitedTitle')}</h3>
            <Field
              label={t('dashboard.inviteCodeLabel')}
              error={slugError ? t(slugError) : undefined}
            >
              {(p) => (
                <Input
                  {...p}
                  value={slug}
                  placeholder="binary-blossoms"
                  onChange={(e) => setSlug(e.target.value)}
                  disabled={pending}
                />
              )}
            </Field>
            <Button type="submit" variant="secondary" disabled={pending}>
              <LinkIcon size={18} aria-hidden="true" />
              {t('dashboard.joinTeam')}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
