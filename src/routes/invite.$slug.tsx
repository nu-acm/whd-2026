import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebHaptics } from 'web-haptics/react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { AuthHeader } from '@/components/AuthHeader';
import { AuthCard } from '@/components/ui/auth-card';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/auth.server';
import { getParticipant } from '@/lib/onboarding.server';
import { getTeamBySlug, joinTeamBySlug } from '@/lib/team.server';
import { isRegistrationOpen, REGISTRATION_CLOSED_I18N_KEY } from '@/lib/registration.server';
import { inviteSlugSchema } from '@/lib/validation';
import { webHapticsOptions } from '@/lib/web-haptics';

/**
 * Resolve an invite link. Anonymous or un-onboarded visitors are sent through
 * login/onboarding first; the slug is preserved so they land back here.
 */
const resolveInvite = createServerFn({ method: 'GET' })
  .inputValidator(inviteSlugSchema)
  .handler(async ({ data }) => {
    const team = await getTeamBySlug(data.slug);
    if (!team) return { status: 'not-found' as const };
    if (!isRegistrationOpen()) return { status: 'closed' as const, team };

    const session = await getSession(getRequest());
    if (!session?.user) return { status: 'anonymous' as const, team };

    const profile = await getParticipant(session.user.id);
    if (!profile) return { status: 'needs-onboarding' as const, team };
    if (profile.teamId) return { status: 'already-in-team' as const, team };
    if (team.isFull) return { status: 'full' as const, team };

    return { status: 'can-join' as const, team };
  });

const acceptInvite = createServerFn({ method: 'POST' })
  .inputValidator(inviteSlugSchema)
  .handler(async ({ data }) => {
    const session = await getSession(getRequest());
    if (!session?.user) throw new Error('Unauthorized');
    if (!isRegistrationOpen()) throw new Error(REGISTRATION_CLOSED_I18N_KEY);
    return joinTeamBySlug(session.user.id, data.slug);
  });

export const Route = createFileRoute('/invite/$slug')({
  loader: async ({ params }) => {
    const result = await resolveInvite({ data: { slug: params.slug } });
    // Come back here after signing in / finishing the profile.
    const search = { redirect: `/invite/${params.slug}` };
    if (result.status === 'anonymous') throw redirect({ to: '/login', search });
    if (result.status === 'needs-onboarding') throw redirect({ to: '/onboarding', search });
    return result;
  },
  component: InvitePage,
});

function InvitePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { slug } = Route.useParams();
  const result = Route.useLoaderData();
  const { trigger } = useWebHaptics(webHapticsOptions);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    setError(null);
    setPending(true);
    try {
      await acceptInvite({ data: { slug } });
      trigger('success');
      navigate({ to: '/dashboard' });
    } catch (err) {
      trigger('error');
      // Server errors may be i18n keys (registration closed); t() passes plain text through.
      setError(err instanceof Error ? err.message : 'dashboard.actionFailed');
      setPending(false);
    }
  };

  const messages: Record<string, string> = {
    'not-found': t('validation.inviteCodeInvalid'),
    closed: t('invite.registrationClosed'),
    'already-in-team': t('invite.alreadyInTeam'),
    full: t('invite.teamFull'),
  };

  return (
    <div className="bg-whd-dark flex min-h-screen flex-col">
      <AuthHeader showSignOut />
      <AuthCard
        title={result.status === 'can-join' ? t('invite.title') : t('invite.cannotJoin')}
        subtitle={
          result.status === 'can-join'
            ? t('invite.subtitle', { team: result.team.name })
            : messages[result.status]
        }
      >
        {result.status === 'can-join' ? (
          <div className="flex flex-col gap-3">
            <Button className="w-full" disabled={pending} onClick={join}>
              {pending ? t('common.loading') : t('invite.join')}
            </Button>
            {error && (
              <p role="alert" className="text-sm text-red-400">
                {t(error)}
              </p>
            )}
          </div>
        ) : (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => navigate({ to: '/dashboard' })}
          >
            {t('dashboard.title')}
          </Button>
        )}
      </AuthCard>
    </div>
  );
}
