import { useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebHaptics } from 'web-haptics/react';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { MAX_TEAM_SIZE } from '@/db/schema';
import type { TeamData } from '@/lib/team.server';
import { webHapticsOptions } from '@/lib/web-haptics';

const noopSubscribe = () => () => {};

/**
 * The site origin, read only in the browser. The server snapshot is '', and
 * React swaps in the real value after hydration — computing it inline instead
 * left the invite field blank, since hydration keeps the server-rendered value.
 */
function useOrigin() {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => '',
  );
}

/** Which team action is in flight: a member id for a kick, or leave/dissolve. */
export type PendingTeamAction = string | 'leave' | 'dissolve' | null;

export function TeamCard({
  team,
  currentUserId,
  registrationOpen,
  pendingAction,
  onKick,
  onLeave,
  onDissolve,
}: {
  team: TeamData;
  currentUserId: string;
  registrationOpen: boolean;
  pendingAction: PendingTeamAction;
  onKick: (userId: string) => void;
  onLeave: () => void;
  onDissolve: () => void;
}) {
  const { t } = useTranslation();
  const { trigger } = useWebHaptics(webHapticsOptions);
  const [copied, setCopied] = useState(false);

  const isCaptain = team.captainId === currentUserId;
  const busy = pendingAction !== null;
  const openSlots = Math.max(0, MAX_TEAM_SIZE - team.members.length);
  const origin = useOrigin();
  const inviteUrl = origin ? `${origin}/invite/${team.inviteSlug}` : '';

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      trigger('success');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the input is selectable as a fallback.
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-bold text-white md:text-3xl">{team.name}</h2>
          <span className="text-whd-text-muted text-sm">
            {t('dashboard.membersCount', { count: team.members.length, max: MAX_TEAM_SIZE })}
          </span>
        </div>

        {!registrationOpen && (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-sm text-amber-200">
            {t('dashboard.registrationLocked')}
          </p>
        )}

        {/* Members, then the slots still open */}
        <ul className="flex flex-col gap-2">
          {team.members.map((member) => (
            <li
              key={member.id}
              className="border-whd-border bg-whd-dark/50 flex items-center justify-between gap-3 rounded-lg border px-4 py-3"
            >
              <span className="min-w-0 flex-1 truncate text-white">
                {member.fullName}
                <span className="text-whd-pink-soft ml-2 text-xs">
                  {member.isCaptain ? t('dashboard.captain') : t('dashboard.member')}
                </span>
              </span>
              {registrationOpen && isCaptain && !member.isCaptain && (
                <ConfirmButton
                  variant="ghost"
                  label={t('dashboard.kick')}
                  confirmLabel={t('common.confirm')}
                  loading={pendingAction === member.id}
                  disabled={busy}
                  onConfirm={() => onKick(member.id)}
                />
              )}
            </li>
          ))}
          {Array.from({ length: openSlots }, (_, i) => (
            <li
              key={`open-${i}`}
              className="border-whd-border text-whd-text-dim rounded-lg border border-dashed px-4 py-3 text-sm"
            >
              {t('dashboard.emptySlot')}
            </li>
          ))}
        </ul>

        {registrationOpen && (
          <>
            {/* Invite link */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-white">{t('dashboard.inviteLink')}</span>
              <div className="flex gap-2">
                <Input readOnly value={inviteUrl} onFocus={(e) => e.currentTarget.select()} />
                <Button variant="secondary" onClick={copyInvite} className="shrink-0">
                  {copied ? t('common.copied') : t('common.copy')}
                </Button>
              </div>
              <p className="text-whd-text-dim text-sm">{t('dashboard.inviteHint')}</p>
            </div>

            <div>
              {isCaptain ? (
                <ConfirmButton
                  size="md"
                  label={t('dashboard.dissolve')}
                  confirmLabel={t('common.confirm')}
                  loading={pendingAction === 'dissolve'}
                  loadingLabel={t('common.loading')}
                  disabled={busy}
                  onConfirm={onDissolve}
                />
              ) : (
                <ConfirmButton
                  size="md"
                  label={t('dashboard.leave')}
                  confirmLabel={t('common.confirm')}
                  loading={pendingAction === 'leave'}
                  loadingLabel={t('common.loading')}
                  disabled={busy}
                  onConfirm={onLeave}
                />
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
