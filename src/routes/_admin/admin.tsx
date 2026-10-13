import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { ColumnToggleBar, PlainTh, SortableTh, StatCard } from '@/components/admin/table';
import {
  applyDir,
  compareText,
  useColumnVisibility,
  useSort,
  type ColumnDef,
} from '@/components/admin/table-state';
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

type ParticipantCol = Exclude<keyof ReportParticipant, 'id' | 'teamSlug' | 'teamEligible'>;
type TeamCol = Exclude<keyof ReportTeam, never>;
type TeamSortKey = Exclude<TeamCol, 'members'>;

const PARTICIPANT_COLS: readonly ParticipantCol[] = [
  'fullName',
  'email',
  'iin',
  'phone',
  'parentPhone',
  'city',
  'placeOfStudy',
  'educationLevel',
  'cvUrl',
  'teamName',
  'attended',
  'createdAt',
];
const TEAM_COLS: readonly TeamCol[] = [
  'name',
  'captainName',
  'memberCount',
  'eligible',
  'members',
  'inviteSlug',
  'createdAt',
];

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
  const [participantSort, sortParticipants] = useSort<ParticipantCol>('fullName');
  const [teamSort, sortTeams] = useSort<TeamSortKey>('name');
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);

  const participantCols: ColumnDef<ParticipantCol>[] = PARTICIPANT_COLS.map((key) => ({
    key,
    label: t(`admin.col.${key}`),
  }));
  const teamCols: ColumnDef<TeamCol>[] = TEAM_COLS.map((key) => ({
    key,
    label: t(`admin.col.${key}`),
  }));
  const participantVisibility = useColumnVisibility(participantCols);
  const teamVisibility = useColumnVisibility(teamCols);
  const pv = participantVisibility.visible;
  const tv = teamVisibility.visible;

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

  const participantRows = useMemo(() => {
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
    const { key, dir } = participantSort;
    return [...filtered].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      const cmp =
        typeof av === 'boolean' ? Number(av) - Number(bv) : compareText(av, bv as string | null);
      return applyDir(cmp, dir);
    });
  }, [participantsInFilter, participantQuery, participantSort]);

  const teamRows = useMemo(() => {
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
    const { key, dir } = teamSort;
    return [...filtered].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      const cmp =
        typeof av === 'number' || typeof av === 'boolean'
          ? Number(av) - Number(bv)
          : compareText(av, bv as string);
      return applyDir(cmp, dir);
    });
  }, [teamsInFilter, teamQuery, teamSort]);

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

  const goToTeam = (slug: string) => {
    setTeamFilter('all');
    setTeamQuery('');
    setTab('teams');
    setScrollTarget(`team-${slug}`);
  };

  const goToParticipant = (id: string) => {
    setParticipantFilter('all');
    setParticipantQuery('');
    setTab('participants');
    setScrollTarget(`participant-${id}`);
  };

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
  const shown = isParticipants ? participantRows.length : teamRows.length;
  const inFilter = isParticipants ? participantsInFilter.length : teamsInFilter.length;
  const query = isParticipants ? participantQuery : teamQuery;

  return (
    <main className="mx-auto w-full max-w-[100rem] flex-1 px-6 py-10 sm:px-8 lg:px-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white md:text-4xl">{t('admin.title')}</h1>
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
        <div className="flex gap-2">
          {(['participants', 'teams'] as const).map((key) => (
            <Button
              key={key}
              size="sm"
              variant={tab === key ? 'primary' : 'ghost'}
              onClick={() => setTab(key)}
            >
              {t(`admin.tab_${key}`)}
            </Button>
          ))}
        </div>
        <Input
          value={query}
          onChange={(e) =>
            isParticipants ? setParticipantQuery(e.target.value) : setTeamQuery(e.target.value)
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
            <ColumnToggleBar
              columns={participantCols}
              visible={pv}
              onToggle={participantVisibility.toggle}
              onToggleAll={participantVisibility.toggleAll}
            />
            <Segmented
              label={t('admin.filterLabel')}
              options={eligibilityOptions}
              value={participantFilter}
              onChange={setParticipantFilter}
            />
          </>
        ) : (
          <>
            <ColumnToggleBar
              columns={teamCols}
              visible={tv}
              onToggle={teamVisibility.toggle}
              onToggleAll={teamVisibility.toggleAll}
            />
            <Segmented
              label={t('admin.filterLabel')}
              options={eligibilityOptions}
              value={teamFilter}
              onChange={setTeamFilter}
            />
          </>
        )}
      </div>

      <p className="text-whd-text-muted mb-2 text-xs">
        {t('admin.showingCount', { shown, total: inFilter })}
      </p>

      <div className="border-whd-border overflow-x-auto rounded-2xl border">
        {isParticipants ? (
          <table className="w-full min-w-[60rem] text-left text-sm">
            <thead className="bg-whd-surface text-whd-text-muted">
              <tr>
                {participantCols.map(
                  (col) =>
                    pv[col.key] && (
                      <SortableTh
                        key={col.key}
                        label={col.label}
                        sortKey={col.key}
                        sort={participantSort}
                        onSort={sortParticipants}
                      />
                    ),
                )}
              </tr>
            </thead>
            <tbody>
              {participantRows.map((p) => (
                <tr
                  key={p.id}
                  id={`participant-${p.id}`}
                  className="border-whd-border scroll-mt-24 border-t text-white/90"
                >
                  {pv.fullName && <td className="px-4 py-3 whitespace-nowrap">{p.fullName}</td>}
                  {pv.email && <td className="px-4 py-3 whitespace-nowrap">{p.email}</td>}
                  {pv.iin && <td className="px-4 py-3 whitespace-nowrap tabular-nums">{p.iin}</td>}
                  {pv.phone && <td className="px-4 py-3 whitespace-nowrap">{p.phone}</td>}
                  {pv.parentPhone && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.parentPhone ?? <span className="text-whd-text-dim">—</span>}
                    </td>
                  )}
                  {pv.city && <td className="px-4 py-3 whitespace-nowrap">{p.city}</td>}
                  {pv.placeOfStudy && <td className="px-4 py-3">{p.placeOfStudy}</td>}
                  {pv.educationLevel && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      {t(`education.${p.educationLevel}`)}
                    </td>
                  )}
                  {pv.cvUrl && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.cvUrl ? (
                        <a
                          href={p.cvUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-whd-pink-soft hover:text-whd-pink-bright hover:underline"
                        >
                          {t('admin.cvOpen')}
                        </a>
                      ) : (
                        <span className="text-whd-text-dim">—</span>
                      )}
                    </td>
                  )}
                  {pv.teamName && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.teamName && p.teamSlug ? (
                        <button
                          type="button"
                          onClick={() => goToTeam(p.teamSlug!)}
                          className="text-whd-pink-soft hover:text-whd-pink-bright cursor-pointer text-left hover:underline"
                        >
                          {p.teamName}
                        </button>
                      ) : (
                        <span className="text-whd-text-dim">—</span>
                      )}
                    </td>
                  )}
                  {pv.attended && <td className="px-4 py-3">{p.attended ? '✓' : ''}</td>}
                  {pv.createdAt && (
                    <td className="text-whd-text-muted px-4 py-3 whitespace-nowrap">
                      {formatDate(p.createdAt)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[50rem] text-left text-sm">
            <thead className="bg-whd-surface text-whd-text-muted">
              <tr>
                {teamCols.map((col) =>
                  !tv[col.key] ? null : col.key === 'members' ? (
                    <PlainTh key={col.key} label={col.label} />
                  ) : (
                    <SortableTh
                      key={col.key}
                      label={col.label}
                      sortKey={col.key}
                      sort={teamSort}
                      onSort={sortTeams}
                    />
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {teamRows.map((team) => (
                <tr
                  key={team.inviteSlug}
                  id={`team-${team.inviteSlug}`}
                  className="border-whd-border scroll-mt-24 border-t text-white/90"
                >
                  {tv.name && <td className="px-4 py-3 whitespace-nowrap">{team.name}</td>}
                  {tv.captainName && (
                    <td className="px-4 py-3 whitespace-nowrap">{team.captainName}</td>
                  )}
                  {tv.memberCount && <td className="px-4 py-3">{team.memberCount}</td>}
                  {tv.eligible && (
                    <td className="px-4 py-3">
                      <span
                        className={team.eligible ? 'text-whd-pink-bright' : 'text-whd-text-dim'}
                      >
                        {team.eligible ? '✓' : '—'}
                      </span>
                    </td>
                  )}
                  {tv.members && (
                    <td className="px-4 py-3">
                      {team.members.map((m, i) => (
                        <span key={m.id}>
                          <button
                            type="button"
                            onClick={() => goToParticipant(m.id)}
                            className="text-whd-pink-soft hover:text-whd-pink-bright cursor-pointer text-left hover:underline"
                          >
                            {m.fullName}
                          </button>
                          {i < team.members.length - 1 && ', '}
                        </span>
                      ))}
                    </td>
                  )}
                  {tv.inviteSlug && (
                    <td className="text-whd-text-muted px-4 py-3 font-mono text-xs">
                      {team.inviteSlug}
                    </td>
                  )}
                  {tv.createdAt && (
                    <td className="text-whd-text-muted px-4 py-3 whitespace-nowrap">
                      {formatDate(team.createdAt)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {shown === 0 && <p className="text-whd-text-muted py-10 text-center">{t('admin.empty')}</p>}
    </main>
  );
}
