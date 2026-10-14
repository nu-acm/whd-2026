import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';

import { useAdminTable, type AdminColumnDef } from '@/components/admin/use-admin-table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Empty, EmptyDescription } from '@/components/ui/empty';
import { Button, LinkButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { ColumnToggleBar, AdminDataTable, StatCard } from '@/components/admin/table';
import { getSession } from '@/lib/auth.server';
import { sessionIsAdmin } from '@/lib/admin.server';
import {
  getReportData,
  participantsToCsv,
  type ReportParticipant,
  type ReportTeam,
} from '@/lib/report.server';
import { useAdminRefresh } from '@/lib/use-admin-refresh';

const loadReport = createServerFn({ method: 'GET' }).handler(async () => {
  // Re-checked here as well: the layout guard protects navigation, this
  // protects the data itself.
  const session = await getSession(getRequest());
  if (!sessionIsAdmin(session)) throw new Error('Forbidden');
  return getReportData();
});

const downloadCsv = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getSession(getRequest());
  if (!sessionIsAdmin(session)) throw new Error('Forbidden');
  const { participants } = await getReportData();
  return participantsToCsv(participants);
});

/** Cached for 5 minutes; organisers pull fresh data with the header's Refresh. */
const reportQueryOptions = queryOptions({
  queryKey: ['admin-report'],
  queryFn: () => loadReport(),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute('/_admin/admin')({
  loader: ({ context }) => context.queryClient.ensureQueryData(reportQueryOptions),
  component: AdminPage,
});

type Tab = 'participants' | 'teams';
type Eligibility = 'all' | 'eligible' | 'not-eligible';

const participantId = (row: ReportParticipant) => row.id;
const teamId = (row: ReportTeam) => row.inviteSlug;

const matches = (needle: string, ...fields: (string | null)[]) =>
  fields.some((f) => f?.toLowerCase().includes(needle));

function AdminPage() {
  const { t, i18n } = useTranslation();
  const { data, isFetching, refetch } = useSuspenseQuery(reportQueryOptions);
  const { participants, teams, stats } = data;
  useAdminRefresh(refetch, isFetching);

  const [tab, setTab] = useState<Tab>('participants');
  const [participantQuery, setParticipantQuery] = useState('');
  const [teamQuery, setTeamQuery] = useState('');
  const [participantFilter, setParticipantFilter] = useState<Eligibility>('all');
  const [teamFilter, setTeamFilter] = useState<Eligibility>('all');
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);

  const goToTeam = useCallback((slug: string) => {
    setTeamFilter('all');
    setTeamQuery('');
    setTab('teams');
    setScrollTarget(`team-${slug}`);
  }, []);
  const goToParticipant = useCallback((id: string) => {
    setParticipantFilter('all');
    setParticipantQuery('');
    setTab('participants');
    setScrollTarget(`participant-${id}`);
  }, []);

  const formatDate = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language, {
      dateStyle: 'short',
      timeZone: 'Asia/Almaty',
    });
    return (iso: string) => {
      const d = new Date(iso);
      return isNaN(d.getTime()) ? '—' : fmt.format(d);
    };
  }, [i18n.language]);

  const eligibleParticipants = participants.filter((p) => p.teamEligible).length;

  const participantsInFilter = useMemo(
    () =>
      participantFilter === 'all'
        ? participants
        : participants.filter((p) => p.teamEligible === (participantFilter === 'eligible')),
    [participants, participantFilter],
  );
  const teamsInFilter = useMemo(
    () =>
      teamFilter === 'all'
        ? teams
        : teams.filter((team) => team.eligible === (teamFilter === 'eligible')),
    [teams, teamFilter],
  );

  const participantMatches = useMemo(() => {
    const needle = participantQuery.trim().toLowerCase();
    const filtered = !needle
      ? participantsInFilter
      : participantsInFilter.filter((p) =>
          matches(
            needle,
            p.fullName,
            p.email,
            p.iin,
            p.phone,
            p.parentPhone,
            p.city,
            p.placeOfStudy,
            p.educationLevel,
            p.teamName,
          ),
        );
    return filtered;
  }, [participantsInFilter, participantQuery]);

  const teamMatches = useMemo(() => {
    const needle = teamQuery.trim().toLowerCase();
    const filtered = !needle
      ? teamsInFilter
      : teamsInFilter.filter((team) =>
          matches(
            needle,
            team.name,
            team.captainName,
            team.inviteSlug,
            ...team.members.map((m) => m.fullName),
          ),
        );
    return filtered;
  }, [teamsInFilter, teamQuery]);

  const participantCols = useMemo<AdminColumnDef<ReportParticipant>[]>(
    () => [
      {
        id: 'fullName',
        accessorFn: (p) => p.fullName,
        meta: { label: t('admin.col.fullName') },
        cell: ({ row }) => row.original.fullName,
      },
      {
        id: 'email',
        accessorFn: (p) => p.email,
        meta: { label: t('admin.col.email') },
        cell: ({ row }) => row.original.email,
      },
      {
        id: 'iin',
        accessorFn: (p) => p.iin,
        meta: { label: t('admin.col.iin'), tone: 'numeric' },
        cell: ({ row }) => row.original.iin,
      },
      {
        id: 'phone',
        accessorFn: (p) => p.phone,
        meta: { label: t('admin.col.phone') },
        cell: ({ row }) => row.original.phone,
      },
      {
        id: 'parentPhone',
        accessorFn: (p) => p.parentPhone,
        meta: { label: t('admin.col.parentPhone') },
        cell: ({ row }) =>
          row.original.parentPhone ?? <span className="text-muted-foreground">—</span>,
      },
      {
        id: 'city',
        accessorFn: (p) => p.city,
        meta: { label: t('admin.col.city') },
        cell: ({ row }) => row.original.city,
      },
      {
        id: 'placeOfStudy',
        accessorFn: (p) => p.placeOfStudy,
        meta: { label: t('admin.col.placeOfStudy') },
        cell: ({ row }) => row.original.placeOfStudy,
      },
      {
        id: 'educationLevel',
        accessorFn: (p) => p.educationLevel,
        meta: { label: t('admin.col.educationLevel') },
        cell: ({ row }) => t(`education.${row.original.educationLevel}`),
      },
      {
        id: 'cvUrl',
        accessorFn: (p) => p.cvUrl,
        meta: { label: t('admin.col.cvUrl') },
        cell: ({ row }) =>
          row.original.cvUrl ? (
            <LinkButton
              href={row.original.cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="table-link"
              size="none"
            >
              {t('admin.cvOpen')}
            </LinkButton>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'teamName',
        accessorFn: (p) => p.teamName,
        meta: { label: t('admin.col.teamName') },
        cell: ({ row }) => {
          const { teamName, teamSlug } = row.original;
          return teamName && teamSlug ? (
            <Button variant="table-link" size="none" onClick={() => goToTeam(teamSlug)}>
              {teamName}
            </Button>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        id: 'attended',
        accessorFn: (p) => p.attended,
        meta: { label: t('admin.col.attended') },
        sortFn: (a, b) => Number(a.original.attended) - Number(b.original.attended),
        cell: ({ row }) => (row.original.attended ? '✓' : ''),
      },
      {
        id: 'createdAt',
        accessorFn: (p) => p.createdAt,
        meta: { label: t('admin.col.createdAt'), tone: 'muted' },
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
    ],
    [t, formatDate, goToTeam],
  );
  const teamCols = useMemo<AdminColumnDef<ReportTeam>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (team) => team.name,
        meta: { label: t('admin.col.name') },
        cell: ({ row }) => row.original.name,
      },
      {
        id: 'captainName',
        accessorFn: (team) => team.captainName,
        meta: { label: t('admin.col.captainName') },
        cell: ({ row }) => row.original.captainName,
      },
      {
        id: 'memberCount',
        accessorFn: (team) => team.memberCount,
        meta: { label: t('admin.col.memberCount') },
        sortFn: (a, b) => a.original.memberCount - b.original.memberCount,
        cell: ({ row }) => row.original.memberCount,
      },
      {
        id: 'eligible',
        accessorFn: (team) => team.eligible,
        meta: { label: t('admin.col.eligible') },
        sortFn: (a, b) => Number(a.original.eligible) - Number(b.original.eligible),
        cell: ({ row }) => (
          <span
            className={row.original.eligible ? 'text-whd-pink-bright' : 'text-muted-foreground'}
          >
            {row.original.eligible ? '✓' : '—'}
          </span>
        ),
      },
      {
        id: 'members',
        enableSorting: false,
        meta: { label: t('admin.col.members') },
        cell: ({ row }) =>
          row.original.members.map((member, index) => (
            <span key={member.id}>
              <Button variant="table-link" size="none" onClick={() => goToParticipant(member.id)}>
                {member.fullName}
              </Button>
              {index < row.original.members.length - 1 && ', '}
            </span>
          )),
      },
      {
        id: 'inviteSlug',
        accessorFn: (team) => team.inviteSlug,
        meta: { label: t('admin.col.inviteSlug'), tone: 'slug' },
        cell: ({ row }) => row.original.inviteSlug,
      },
      {
        id: 'createdAt',
        accessorFn: (team) => team.createdAt,
        meta: { label: t('admin.col.createdAt'), tone: 'muted' },
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
    ],
    [t, formatDate, goToParticipant],
  );
  const participantTable = useAdminTable(
    participantMatches,
    participantCols,
    'fullName',
    participantId,
  );
  const teamTable = useAdminTable(teamMatches, teamCols, 'name', teamId);

  // After switching tabs, wait for the target row to render, then scroll to and flash it.
  useEffect(() => {
    if (!scrollTarget) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        const el = document.getElementById(scrollTarget);
        setScrollTarget(null);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('admin-highlight');
        timeout = setTimeout(() => el.classList.remove('admin-highlight'), 2000);
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
      clearTimeout(timeout);
    };
  }, [scrollTarget, tab]);

  const exportCsv = async () => {
    const csv = await downloadCsv();
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `whd-participants-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const eligibilityOptions = [
    { value: 'all', label: t('admin.filterAll') },
    { value: 'eligible', label: t('admin.filterEligible') },
    { value: 'not-eligible', label: t('admin.filterNotEligible') },
  ] as const;

  const isParticipants = tab === 'participants';
  const shown = isParticipants
    ? participantTable.getRowModel().rows.length
    : teamTable.getRowModel().rows.length;
  const inFilter = isParticipants ? participantsInFilter.length : teamsInFilter.length;
  const query = isParticipants ? participantQuery : teamQuery;

  return (
    <main className="mx-auto w-full max-w-admin flex-1 px-6 py-10 sm:px-8 lg:px-12">
      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">{t('admin.title')}</h1>
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            {t('admin.exportCsv')}
          </Button>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t('admin.statParticipants')}
            value={stats.participants}
            breakdown={t('admin.eligibleBreakdown', {
              eligible: eligibleParticipants,
              other: stats.participants - eligibleParticipants,
            })}
          />
          <StatCard
            label={t('admin.statTeams')}
            value={stats.teams}
            breakdown={t('admin.eligibleBreakdown', {
              eligible: stats.eligibleTeams,
              other: stats.teams - stats.eligibleTeams,
            })}
          />
          <StatCard label={t('admin.statTeamless')} value={stats.teamless} />
          <StatCard label={t('admin.statAttended')} value={stats.attended} />
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="participants">{t('admin.tab_participants')}</TabsTrigger>
            <TabsTrigger value="teams">{t('admin.tab_teams')}</TabsTrigger>
          </TabsList>
          <Input
            value={query}
            onChange={(e) =>
              isParticipants ? setParticipantQuery(e.target.value) : setTeamQuery(e.target.value)
            }
            aria-label={
              isParticipants ? t('admin.searchPlaceholder') : t('admin.teamSearchPlaceholder')
            }
            placeholder={
              isParticipants ? t('admin.searchPlaceholder') : t('admin.teamSearchPlaceholder')
            }
            className="max-w-xs"
          />
        </div>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          {isParticipants ? (
            <>
              <ColumnToggleBar table={participantTable} />
              <Segmented
                label={t('admin.filterLabel')}
                options={eligibilityOptions}
                value={participantFilter}
                onChange={setParticipantFilter}
              />
            </>
          ) : (
            <>
              <ColumnToggleBar table={teamTable} />
              <Segmented
                label={t('admin.filterLabel')}
                options={eligibilityOptions}
                value={teamFilter}
                onChange={setTeamFilter}
              />
            </>
          )}
        </div>

        <p className="mb-2 text-xs text-whd-text-muted">
          {t('admin.showingCount', { shown, total: inFilter })}
        </p>

        <div className="overflow-x-auto rounded-2xl border border-whd-border">
          <TabsContent value="participants">
            <AdminDataTable
              table={participantTable}
              variant="participants"
              rowPrefix="participant"
            />
          </TabsContent>
          <TabsContent value="teams">
            <AdminDataTable table={teamTable} variant="teams" rowPrefix="team" />
          </TabsContent>
        </div>

        {shown === 0 && (
          <Empty>
            <EmptyDescription>{t('admin.empty')}</EmptyDescription>
          </Empty>
        )}
      </Tabs>
    </main>
  );
}
