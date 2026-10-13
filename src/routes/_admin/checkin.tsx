import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
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
import { MIN_TEAM_SIZE } from '@/db/schema';
import { getSession } from '@/lib/auth.server';
import { sessionIsAdmin } from '@/lib/admin.server';
import {
  getCheckinData,
  setAttendance,
  type CheckinData,
  type CheckinTeam,
} from '@/lib/checkin.server';
import { useAdminRefresh } from '@/lib/use-admin-refresh';

async function assertAdmin() {
  const session = await getSession(getRequest());
  if (!sessionIsAdmin(session)) throw new Error('Forbidden');
}

const loadCheckin = createServerFn({ method: 'GET' }).handler(async () => {
  await assertAdmin();
  return getCheckinData();
});

const setAttendanceFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ participantId: z.string().min(1), attended: z.boolean() }))
  .handler(async ({ data }) => {
    await assertAdmin();
    return setAttendance(data.participantId, data.attended);
  });

const checkinQueryKey = ['checkin-data'] as const;

/** Never stale on its own: this tab's toggles update the cache directly; Refresh pulls others'. */
const checkinQueryOptions = queryOptions({
  queryKey: checkinQueryKey,
  queryFn: () => loadCheckin(),
  staleTime: Infinity,
  refetchOnWindowFocus: false,
});

export const Route = createFileRoute('/_admin/checkin')({
  loader: ({ context }) => context.queryClient.ensureQueryData(checkinQueryOptions),
  component: CheckinPage,
});

type Tab = 'participants' | 'teams';
type AttendanceFilter = 'all' | 'attended' | 'not-attended';
/** ready: enough members present to compete; partial: some; no-show: none. */
type TeamStatus = 'ready' | 'partial' | 'no-show';

type ParticipantCol = 'fullName' | 'teamName' | 'placeOfStudy' | 'educationLevel';
type TeamCol = 'name' | 'captainName' | 'members' | 'attended';
type TeamSortKey = Exclude<TeamCol, 'members'>;

const attendedCount = (team: CheckinTeam) => team.members.filter((m) => m.attended).length;

function teamStatus(team: CheckinTeam): TeamStatus {
  const present = attendedCount(team);
  if (present >= MIN_TEAM_SIZE) return 'ready';
  return present > 0 ? 'partial' : 'no-show';
}

/** Apply one attendance change to the cached data, in both lists. */
function withAttendance(data: CheckinData | undefined, id: string, attended: boolean) {
  if (!data) return data;
  return {
    participants: data.participants.map((p) => (p.id === id ? { ...p, attended } : p)),
    teams: data.teams.map((team) => ({
      ...team,
      members: team.members.map((m) => (m.id === id ? { ...m, attended } : m)),
    })),
  };
}

/** Checking in is one click; un-checking asks first, since it is usually a mis-tap. */
function AttendanceCheckbox({
  checked,
  disabled,
  name,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  name: string;
  onChange: (attended: boolean) => void;
}) {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => (e.target.checked ? onChange(true) : setConfirmOpen(true))}
        aria-label={
          checked ? t('admin.markAbsentLabel', { name }) : t('admin.markPresentLabel', { name })
        }
        className="accent-whd-pink h-5 w-5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('admin.confirmAbsentTitle')}
        description={t('admin.confirmAbsentBody', { name })}
        confirmLabel={t('admin.markAbsent')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => onChange(false)}
      />
    </>
  );
}

function CheckinPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isFetching, refetch } = useSuspenseQuery(checkinQueryOptions);
  const { participants, teams } = data;
  useAdminRefresh(refetch, isFetching);

  const [tab, setTab] = useState<Tab>('participants');
  const [participantQuery, setParticipantQuery] = useState('');
  const [teamQuery, setTeamQuery] = useState('');
  const [participantFilter, setParticipantFilter] = useState<AttendanceFilter>('all');
  const [teamFilter, setTeamFilter] = useState<'all' | TeamStatus>('all');
  const [participantSort, sortParticipants] = useSort<ParticipantCol>('fullName');
  const [teamSort, sortTeams] = useSort<TeamSortKey>('name');
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);

  const participantCols: ColumnDef<ParticipantCol>[] = (
    ['fullName', 'teamName', 'placeOfStudy', 'educationLevel'] as const
  ).map((key) => ({ key, label: t(`admin.col.${key}`) }));
  const teamCols: ColumnDef<TeamCol>[] = (
    ['name', 'captainName', 'members', 'attended'] as const
  ).map((key) => ({ key, label: t(`admin.col.${key}`) }));
  const participantVisibility = useColumnVisibility(participantCols);
  const teamVisibility = useColumnVisibility(teamCols);
  const pv = participantVisibility.visible;
  const tv = teamVisibility.visible;

  const presentCount = participants.filter((p) => p.attended).length;
  const statusCounts = useMemo(() => {
    const counts: Record<TeamStatus, number> = { ready: 0, partial: 0, 'no-show': 0 };
    for (const team of teams) counts[teamStatus(team)] += 1;
    return counts;
  }, [teams]);

  const participantsInFilter = useMemo(
    () =>
      participantFilter === 'all'
        ? participants
        : participants.filter((p) => p.attended === (participantFilter === 'attended')),
    [participants, participantFilter],
  );
  const teamsInFilter = useMemo(
    () => (teamFilter === 'all' ? teams : teams.filter((team) => teamStatus(team) === teamFilter)),
    [teams, teamFilter],
  );

  const participantRows = useMemo(() => {
    const needle = participantQuery.trim().toLowerCase();
    const filtered = !needle
      ? participantsInFilter
      : participantsInFilter.filter((p) =>
          // IIN and phone too: the check-in desk often asks for one of them.
          [p.fullName, p.iin, p.phone, p.teamName, p.placeOfStudy, p.educationLevel].some((f) =>
            f.toLowerCase().includes(needle),
          ),
        );
    const { key, dir } = participantSort;
    return [...filtered].sort((a, b) => applyDir(compareText(a[key], b[key]), dir));
  }, [participantsInFilter, participantQuery, participantSort]);

  const teamRows = useMemo(() => {
    const needle = teamQuery.trim().toLowerCase();
    const filtered = !needle
      ? teamsInFilter
      : teamsInFilter.filter((team) =>
          [team.name, team.captainName, ...team.members.map((m) => m.fullName)].some((f) =>
            f.toLowerCase().includes(needle),
          ),
        );
    const { key, dir } = teamSort;
    return [...filtered].sort((a, b) => {
      const cmp =
        key === 'attended'
          ? attendedCount(a) - attendedCount(b) || a.members.length - b.members.length
          : compareText(a[key], b[key]);
      return applyDir(cmp, dir);
    });
  }, [teamsInFilter, teamQuery, teamSort]);

  const setPending = (id: string, pending: boolean) =>
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });

  // Optimistic: tick the box immediately, roll back if the server refuses.
  const attendance = useMutation({
    mutationFn: (vars: { participantId: string; attended: boolean }) =>
      setAttendanceFn({ data: vars }),
    onMutate: async ({ participantId, attended }) => {
      setPending(participantId, true);
      setError(null);
      await queryClient.cancelQueries({ queryKey: checkinQueryKey });
      const previous = queryClient.getQueryData<CheckinData>(checkinQueryKey);
      queryClient.setQueryData<CheckinData>(checkinQueryKey, (d) =>
        withAttendance(d, participantId, attended),
      );
      return {
        previousAttended: previous?.participants.find((p) => p.id === participantId)?.attended,
      };
    },
    onError: (err, { participantId }, context) => {
      if (context?.previousAttended !== undefined) {
        const previousAttended = context.previousAttended;
        queryClient.setQueryData<CheckinData>(checkinQueryKey, (d) =>
          withAttendance(d, participantId, previousAttended),
        );
      }
      setError(err instanceof Error ? err.message : t('admin.attendanceFailed'));
    },
    onSuccess: (row) => {
      queryClient.setQueryData<CheckinData>(checkinQueryKey, (d) =>
        withAttendance(d, row.id, row.attended),
      );
    },
    onSettled: (_row, _err, vars) => setPending(vars.participantId, false),
  });

  const setAttended = (participantId: string, attended: boolean) =>
    attendance.mutate({ participantId, attended });

  const isParticipants = tab === 'participants';
  const shown = isParticipants ? participantRows.length : teamRows.length;
  const inFilter = isParticipants ? participantsInFilter.length : teamsInFilter.length;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white md:text-4xl">{t('admin.checkinTitle')}</h1>
        <p className="text-whd-text-muted mt-2 text-sm">
          {t('admin.checkinScope', { min: MIN_TEAM_SIZE })}
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <StatCard
          label={t('admin.statEligibleParticipants')}
          value={participants.length}
          breakdown={t('admin.attendanceBreakdown', {
            present: presentCount,
            absent: participants.length - presentCount,
          })}
        />
        <StatCard
          label={t('admin.statEligibleTeams')}
          value={teams.length}
          breakdown={t('admin.teamStatusBreakdown', {
            ready: statusCounts.ready,
            partial: statusCounts.partial,
            noShow: statusCounts['no-show'],
          })}
        />
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
          value={isParticipants ? participantQuery : teamQuery}
          onChange={(e) =>
            isParticipants ? setParticipantQuery(e.target.value) : setTeamQuery(e.target.value)
          }
          placeholder={
            isParticipants ? t('admin.checkinSearchPlaceholder') : t('admin.teamSearchPlaceholder')
          }
          className="max-w-xs"
          autoFocus
        />
      </div>

      {error && (
        <p role="alert" className="mb-3 text-sm text-red-400">
          {error}
        </p>
      )}

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
              value={participantFilter}
              onChange={setParticipantFilter}
              options={[
                { value: 'all', label: t('admin.filterAll') },
                { value: 'attended', label: t('admin.filterAttended') },
                { value: 'not-attended', label: t('admin.filterNotAttended') },
              ]}
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
              value={teamFilter}
              onChange={setTeamFilter}
              options={[
                { value: 'all', label: t('admin.filterAll') },
                { value: 'ready', label: t('admin.statusReady') },
                { value: 'partial', label: t('admin.statusPartial') },
                { value: 'no-show', label: t('admin.statusNoShow') },
              ]}
            />
          </>
        )}
      </div>

      <p className="text-whd-text-muted mb-2 text-xs">
        {t('admin.showingCount', { shown, total: inFilter })}
      </p>

      <div className="border-whd-border overflow-x-auto rounded-2xl border">
        {isParticipants ? (
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-whd-surface text-whd-text-muted">
              <tr>
                <PlainTh label={t('admin.col.attended')} />
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
                <tr key={p.id} className="border-whd-border border-t text-white/90">
                  <td className="px-4 py-3">
                    <AttendanceCheckbox
                      checked={p.attended}
                      disabled={pendingIds.has(p.id)}
                      name={p.fullName}
                      onChange={(attended) => setAttended(p.id, attended)}
                    />
                  </td>
                  {pv.fullName && <td className="px-4 py-3">{p.fullName}</td>}
                  {pv.teamName && <td className="text-whd-text-muted px-4 py-3">{p.teamName}</td>}
                  {pv.placeOfStudy && (
                    <td className="text-whd-text-muted px-4 py-3">{p.placeOfStudy}</td>
                  )}
                  {pv.educationLevel && (
                    <td className="text-whd-text-muted px-4 py-3 whitespace-nowrap">
                      {t(`education.${p.educationLevel}`)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[40rem] text-left text-sm">
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
                <tr key={team.id} className="border-whd-border border-t text-white/90">
                  {tv.name && <td className="px-4 py-3">{team.name}</td>}
                  {tv.captainName && (
                    <td className="text-whd-text-muted px-4 py-3">{team.captainName}</td>
                  )}
                  {tv.members && (
                    <td className="px-4 py-3">
                      {team.members.map((m, i) => (
                        <span
                          key={m.id}
                          className={m.attended ? 'text-whd-pink-bright' : 'text-whd-text-dim'}
                        >
                          {m.fullName}
                          {i < team.members.length - 1 && ', '}
                        </span>
                      ))}
                    </td>
                  )}
                  {tv.attended && (
                    <td className="px-4 py-3 font-medium tabular-nums">
                      {attendedCount(team)}/{team.members.length}
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
