import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { useAdminTable, type AdminColumnDef } from '@/components/admin/use-admin-table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Empty, EmptyDescription } from '@/components/ui/empty';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { ColumnToggleBar, AdminDataTable, StatCard } from '@/components/admin/table';
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
  .validator(z.object({ participantId: z.string().min(1), attended: z.boolean() }))
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

const participantId = (row: CheckinData['participants'][number]) => row.id;
const teamId = (row: CheckinTeam) => row.id;

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
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => (next ? onChange(true) : setConfirmOpen(true))}
        aria-label={
          checked ? t('admin.markAbsentLabel', { name }) : t('admin.markPresentLabel', { name })
        }
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

const AttendanceActionsContext = createContext<{
  pendingIds: ReadonlySet<string>;
  setAttended: (id: string, attended: boolean) => void;
} | null>(null);

function AttendanceCell({
  row,
}: {
  row: { id: string; original: CheckinData['participants'][number] };
}) {
  const actions = useContext(AttendanceActionsContext);
  if (!actions) throw new Error('Attendance cells require their action provider.');
  return (
    <AttendanceCheckbox
      checked={row.original.attended}
      disabled={actions.pendingIds.has(row.id)}
      name={row.original.fullName}
      onChange={(attended) => actions.setAttended(row.id, attended)}
    />
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
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);

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

  const participantMatches = useMemo(() => {
    const needle = participantQuery.trim().toLowerCase();
    const filtered = !needle
      ? participantsInFilter
      : participantsInFilter.filter((p) =>
          // IIN and phone too: the check-in desk often asks for one of them.
          [p.fullName, p.iin, p.phone, p.teamName, p.placeOfStudy, p.educationLevel].some((f) =>
            f.toLowerCase().includes(needle),
          ),
        );
    return filtered;
  }, [participantsInFilter, participantQuery]);

  const teamMatches = useMemo(() => {
    const needle = teamQuery.trim().toLowerCase();
    const filtered = !needle
      ? teamsInFilter
      : teamsInFilter.filter((team) =>
          [team.name, team.captainName, ...team.members.map((m) => m.fullName)].some((f) =>
            f.toLowerCase().includes(needle),
          ),
        );
    return filtered;
  }, [teamsInFilter, teamQuery]);

  const setPending = (id: string, pending: boolean) =>
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });

  // Optimistic: tick the box immediately, roll back if the server refuses.
  const { mutate } = useMutation({
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

  const setAttended = useCallback(
    (participantId: string, attended: boolean) => mutate({ participantId, attended }),
    [mutate],
  );
  const attendanceActions = useMemo(() => ({ pendingIds, setAttended }), [pendingIds, setAttended]);

  const participantCols = useMemo<AdminColumnDef<CheckinData['participants'][number]>[]>(
    () => [
      {
        id: 'attendance',
        accessorFn: (p) => p.attended,
        enableSorting: false,
        enableHiding: false,
        meta: { label: t('admin.col.attended') },
        cell: AttendanceCell,
      },
      {
        id: 'fullName',
        accessorFn: (p) => p.fullName,
        meta: { label: t('admin.col.fullName') },
        cell: ({ row }) => row.original.fullName,
      },
      {
        id: 'teamName',
        accessorFn: (p) => p.teamName,
        meta: { label: t('admin.col.teamName'), tone: 'muted' },
        cell: ({ row }) => row.original.teamName,
      },
      {
        id: 'placeOfStudy',
        accessorFn: (p) => p.placeOfStudy,
        meta: { label: t('admin.col.placeOfStudy'), tone: 'muted' },
        cell: ({ row }) => row.original.placeOfStudy,
      },
      {
        id: 'educationLevel',
        accessorFn: (p) => p.educationLevel,
        meta: { label: t('admin.col.educationLevel'), tone: 'muted' },
        cell: ({ row }) => t(`education.${row.original.educationLevel}`),
      },
    ],
    [t],
  );
  const teamCols = useMemo<AdminColumnDef<CheckinTeam>[]>(
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
        meta: { label: t('admin.col.captainName'), tone: 'muted' },
        cell: ({ row }) => row.original.captainName,
      },
      {
        id: 'members',
        enableSorting: false,
        meta: { label: t('admin.col.members') },
        cell: ({ row }) =>
          row.original.members.map((member, index) => (
            <span
              key={member.id}
              className={member.attended ? 'text-whd-pink-bright' : 'text-muted-foreground'}
            >
              {member.fullName}
              {index < row.original.members.length - 1 && ', '}
            </span>
          )),
      },
      {
        id: 'attended',
        accessorFn: attendedCount,
        meta: { label: t('admin.col.attended'), tone: 'numeric' },
        sortFn: (a, b) =>
          attendedCount(a.original) - attendedCount(b.original) ||
          a.original.members.length - b.original.members.length,
        cell: ({ row }) => `${attendedCount(row.original)}/${row.original.members.length}`,
      },
    ],
    [t],
  );
  const participantTable = useAdminTable(
    participantMatches,
    participantCols,
    'fullName',
    participantId,
  );
  const teamTable = useAdminTable(teamMatches, teamCols, 'name', teamId);

  const isParticipants = tab === 'participants';
  const shown = isParticipants
    ? participantTable.getRowModel().rows.length
    : teamTable.getRowModel().rows.length;
  const inFilter = isParticipants ? participantsInFilter.length : teamsInFilter.length;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:px-8">
      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            {t('admin.checkinTitle')}
          </h1>
          <p className="mt-2 text-sm text-whd-text-muted">
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
          <TabsList>
            <TabsTrigger value="participants">{t('admin.tab_participants')}</TabsTrigger>
            <TabsTrigger value="teams">{t('admin.tab_teams')}</TabsTrigger>
          </TabsList>
          <Input
            value={isParticipants ? participantQuery : teamQuery}
            onChange={(e) =>
              isParticipants ? setParticipantQuery(e.target.value) : setTeamQuery(e.target.value)
            }
            aria-label={
              isParticipants ? t('admin.searchPlaceholder') : t('admin.teamSearchPlaceholder')
            }
            placeholder={
              isParticipants
                ? t('admin.checkinSearchPlaceholder')
                : t('admin.teamSearchPlaceholder')
            }
            className="max-w-xs"
            autoFocus
          />
        </div>

        {error && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          {isParticipants ? (
            <>
              <ColumnToggleBar table={participantTable} />
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
              <ColumnToggleBar table={teamTable} />
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

        <p className="mb-2 text-xs text-whd-text-muted">
          {t('admin.showingCount', { shown, total: inFilter })}
        </p>

        <div className="overflow-x-auto rounded-2xl border border-whd-border">
          <TabsContent value="participants">
            <AttendanceActionsContext value={attendanceActions}>
              <AdminDataTable table={participantTable} variant="checkin" />
            </AttendanceActionsContext>
          </TabsContent>
          <TabsContent value="teams">
            <AdminDataTable table={teamTable} variant="checkin" />
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
