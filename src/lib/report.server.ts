import { env } from 'cloudflare:workers';
import { getDb } from '@/db';

interface AppEnv {
  DB: D1Database;
}

function getAppDb() {
  return getDb((env as unknown as AppEnv).DB);
}

export type ReportParticipant = {
  id: string;
  fullName: string;
  email: string;
  iin: string;
  phone: string;
  city: string;
  placeOfStudy: string;
  parentPhone: string | null;
  educationLevel: string;
  /** Google Drive link to the uploaded PDF; organisers need access to the CV folder. */
  cvUrl: string | null;
  teamName: string | null;
  /** Links the participant row to its team row in the admin table. */
  teamSlug: string | null;
  /** In a team that has reached MIN_TEAM_SIZE. */
  teamEligible: boolean;
  attended: boolean;
  createdAt: string;
};

export type ReportTeam = {
  name: string;
  inviteSlug: string;
  captainName: string;
  memberCount: number;
  /** A team only competes once it reaches MIN_TEAM_SIZE. */
  eligible: boolean;
  /** Captain first. */
  members: { id: string; fullName: string }[];
  createdAt: string;
};

export type ReportStats = {
  participants: number;
  teams: number;
  eligibleTeams: number;
  teamless: number;
  attended: number;
};

const toIso = (v: Date | number) => (v instanceof Date ? v : new Date(v)).toISOString();

export async function getReportData(): Promise<{
  participants: ReportParticipant[];
  teams: ReportTeam[];
  stats: ReportStats;
}> {
  const db = getAppDb();
  const { MIN_TEAM_SIZE } = await import('@/db/schema');

  const [participantRows, teamRows] = await Promise.all([
    db.query.participant.findMany({
      with: {
        user: { columns: { email: true } },
        team: { columns: { name: true, inviteSlug: true } },
      },
    }),
    db.query.team.findMany({
      with: {
        captain: { columns: { fullName: true } },
        members: { columns: { id: true, fullName: true } },
      },
    }),
  ]);

  const eligibleTeamIds = new Set(
    teamRows.filter((t) => t.members.length >= MIN_TEAM_SIZE).map((t) => t.id),
  );

  const participants: ReportParticipant[] = participantRows.map((p) => ({
    id: p.id,
    fullName: p.fullName,
    email: p.user?.email ?? '',
    iin: p.iin,
    phone: p.phone,
    city: p.city,
    placeOfStudy: p.placeOfStudy,
    parentPhone: p.parentPhone,
    educationLevel: p.educationLevel,
    cvUrl: p.cvUrl,
    teamName: p.team?.name ?? null,
    teamSlug: p.team?.inviteSlug ?? null,
    teamEligible: !!p.teamId && eligibleTeamIds.has(p.teamId),
    attended: p.attended,
    createdAt: toIso(p.createdAt),
  }));

  const teams: ReportTeam[] = teamRows.map((t) => {
    // Captain first, then everyone else, so the roster reads predictably.
    const ordered = [
      ...t.members.filter((m) => m.id === t.captainId),
      ...t.members.filter((m) => m.id !== t.captainId),
    ];
    return {
      name: t.name,
      inviteSlug: t.inviteSlug,
      captainName: t.captain?.fullName ?? '',
      memberCount: t.members.length,
      eligible: t.members.length >= MIN_TEAM_SIZE,
      members: ordered,
      createdAt: toIso(t.createdAt),
    };
  });

  return {
    participants,
    teams,
    stats: {
      participants: participants.length,
      teams: teams.length,
      eligibleTeams: teams.filter((t) => t.eligible).length,
      teamless: participants.filter((p) => !p.teamName).length,
      attended: participants.filter((p) => p.attended).length,
    },
  };
}

/** Rows as CSV, for organisers who want the data in a spreadsheet. */
export function participantsToCsv(rows: ReportParticipant[]): string {
  const headers = [
    'Full name',
    'Email',
    'IIN',
    'Phone',
    'City',
    'Place of study',
    'Parent phone',
    'Education level',
    'CV',
    'Team',
    'Attended',
    'Registered at',
  ];
  const escape = (v: string | null | boolean) => {
    const s = v === null ? '' : String(v);
    // Keep formulas inert and leading-zero identifiers as text in spreadsheet imports.
    // eslint-disable-next-line no-control-regex -- Spreadsheet importers can ignore leading controls.
    const formulaPrefix = /^[\s\u0000-\u001f]*[=+@-]/;
    const asText = formulaPrefix.test(s) || /^[\t\r\n]/.test(s) || /^0\d+$/.test(s);
    const safe = asText ? `'${s}` : s;
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const lines = rows.map((r) =>
    [
      r.fullName,
      r.email,
      r.iin,
      r.phone,
      r.city,
      r.placeOfStudy,
      r.parentPhone,
      r.educationLevel,
      r.cvUrl,
      r.teamName,
      r.attended ? 'yes' : 'no',
      r.createdAt,
    ]
      .map(escape)
      .join(','),
  );
  return [headers.join(','), ...lines].join('\n');
}
