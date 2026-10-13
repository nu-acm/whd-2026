import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebHaptics } from 'web-haptics/react';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';

import { AuthHeader } from '@/components/AuthHeader';
import { TeamCard, type PendingTeamAction } from '@/components/dashboard/TeamCard';
import { NoTeamCard } from '@/components/dashboard/NoTeamCard';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { CvCard } from '@/components/dashboard/CvCard';
import { ensureSession } from '@/lib/auth.server';
import { getParticipant } from '@/lib/onboarding.server';
import {
  createTeam,
  dissolveTeam,
  getTeamByParticipant,
  joinTeamBySlug,
  kickMember,
  leaveTeam,
} from '@/lib/team.server';
import { isRegistrationOpen, REGISTRATION_CLOSED_I18N_KEY } from '@/lib/registration.server';
import { createTeamSchema, inviteSlugSchema } from '@/lib/validation';
import { webHapticsOptions } from '@/lib/web-haptics';

/** Every team mutation is blocked once the deadline passes. */
function assertRegistrationOpen() {
  if (!isRegistrationOpen()) throw new Error(REGISTRATION_CLOSED_I18N_KEY);
}

const loadDashboard = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await ensureSession(getRequest());
  const [profile, team] = await Promise.all([
    getParticipant(session.user.id),
    getTeamByParticipant(session.user.id),
  ]);
  return {
    userId: session.user.id,
    email: session.user.email,
    fullName: profile?.fullName ?? session.user.email,
    team,
    hasCv: !!profile?.cvUrl,
    registrationOpen: isRegistrationOpen(),
  };
});

const createTeamFn = createServerFn({ method: 'POST' })
  .inputValidator(createTeamSchema)
  .handler(async ({ data }) => {
    const session = await ensureSession(getRequest());
    assertRegistrationOpen();
    return createTeam(session.user.id, data.name);
  });

const joinTeamFn = createServerFn({ method: 'POST' })
  .inputValidator(inviteSlugSchema)
  .handler(async ({ data }) => {
    const session = await ensureSession(getRequest());
    assertRegistrationOpen();
    return joinTeamBySlug(session.user.id, data.slug);
  });

const kickMemberFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const session = await ensureSession(getRequest());
    assertRegistrationOpen();
    await kickMember(session.user.id, data.userId);
  });

const leaveTeamFn = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await ensureSession(getRequest());
  assertRegistrationOpen();
  await leaveTeam(session.user.id);
});

const dissolveTeamFn = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await ensureSession(getRequest());
  assertRegistrationOpen();
  await dissolveTeam(session.user.id);
});

const generateTeamNameFn = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await ensureSession(getRequest());
  // Imported lazily so the AI binding is only touched when someone asks.
  const { generateTeamNameForParticipant } = await import('@/lib/ai.server');
  return generateTeamNameForParticipant(session.user.id);
});

export const Route = createFileRoute('/_protected/dashboard')({
  loader: () => loadDashboard(),
  component: DashboardPage,
});

type Feedback = { type: 'success' | 'error'; message: string };

function DashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { trigger } = useWebHaptics(webHapticsOptions);
  const { userId, email, fullName, team, hasCv, registrationOpen } = Route.useLoaderData();
  const [pendingAction, setPendingAction] = useState<PendingTeamAction>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const id = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(id);
  }, [feedback]);

  // Re-run the loader so the UI reflects the new server state.
  const refresh = () => router.invalidate();

  const succeed = async (message: string) => {
    await refresh();
    trigger('success');
    setFeedback({ type: 'success', message });
  };

  /** Kick / leave / dissolve: errors surface in the feedback banner. */
  const runTeamAction = async (
    key: Exclude<PendingTeamAction, null>,
    action: () => Promise<void>,
    successMessage: string,
  ) => {
    setPendingAction(key);
    setFeedback(null);
    try {
      await action();
      await succeed(successMessage);
    } catch (err) {
      trigger('error');
      // Server errors may be i18n keys (registration closed); t() passes plain text through.
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'dashboard.actionFailed',
      });
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="bg-whd-dark flex min-h-screen flex-col">
      <AuthHeader showSignOut email={email} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 sm:px-8 md:py-16">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-3xl font-bold text-white md:text-4xl">
            {t('dashboard.greeting', { name: fullName })}
          </h1>
          <Link
            to="/onboarding"
            className="text-whd-pink-soft hover:text-whd-pink-bright text-sm transition-colors"
          >
            {t('dashboard.editProfile')}
          </Link>
        </div>

        <DashboardStats team={team} />

        {feedback && (
          <p
            role={feedback.type === 'error' ? 'alert' : 'status'}
            className={
              feedback.type === 'error'
                ? 'mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300'
                : 'border-whd-pink/40 bg-whd-pink/10 text-whd-pink-bright mb-6 rounded-lg border px-4 py-3 text-sm'
            }
          >
            {t(feedback.message)}
          </p>
        )}

        {team ? (
          <TeamCard
            team={team}
            currentUserId={userId}
            registrationOpen={registrationOpen}
            pendingAction={pendingAction}
            onKick={(id) => {
              const name = team.members.find((m) => m.id === id)?.fullName ?? '';
              runTeamAction(
                id,
                () => kickMemberFn({ data: { userId: id } }),
                t('dashboard.feedbackKicked', { name }),
              );
            }}
            onLeave={() => runTeamAction('leave', () => leaveTeamFn(), t('dashboard.feedbackLeft'))}
            onDissolve={() =>
              runTeamAction('dissolve', () => dissolveTeamFn(), t('dashboard.feedbackDissolved'))
            }
          />
        ) : (
          <NoTeamCard
            registrationOpen={registrationOpen}
            onCreate={async (name) => {
              await createTeamFn({ data: { name } });
              await succeed(t('dashboard.feedbackCreated', { name }));
            }}
            onJoin={async (slug) => {
              await joinTeamFn({ data: { slug } });
              await succeed(t('dashboard.feedbackJoined'));
            }}
            onGenerate={() => generateTeamNameFn()}
          />
        )}

        <CvCard
          hasCv={hasCv}
          registrationOpen={registrationOpen}
          onDone={succeed}
          onError={(message) => {
            trigger('error');
            setFeedback({ type: 'error', message });
          }}
        />
      </main>
    </div>
  );
}
