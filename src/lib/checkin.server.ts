import { env } from 'cloudflare:workers';
import { count, eq, isNotNull, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { MIN_TEAM_SIZE, participant, team } from '@/db/schema';

interface AppEnv {
  DB: D1Database;
}

function getAppDb() {
  return getDb((env as unknown as AppEnv).DB);
}

export type CheckinParticipant = {
  id: string;
  fullName: string;
  iin: string;
  phone: string;
  teamId: string;
  teamName: string;
  placeOfStudy: string;
  educationLevel: string;
  attended: boolean;
};

export type CheckinTeamMember = {
  id: string;
  fullName: string;
  attended: boolean;
};

export type CheckinTeam = {
  id: string;
  name: string;
  captainName: string;
  /** Captain first, then alphabetical. */
  members: CheckinTeamMember[];
};

/** Only people in eligible teams (exactly MIN_TEAM_SIZE members) are checked in. */
export type CheckinData = {
  participants: CheckinParticipant[];
  teams: CheckinTeam[];
};

const byName = (a: { fullName: string }, b: { fullName: string }) =>
  a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' });

export async function getCheckinData(): Promise<CheckinData> {
  const db = getAppDb();

  // Eligible teams are computed in SQL, so ineligible rosters are never read.
  const eligible = db
    .$with('eligible')
    .as(
      db
        .select({ teamId: participant.teamId })
        .from(participant)
        .where(isNotNull(participant.teamId))
        .groupBy(participant.teamId)
        .having(eq(count(), MIN_TEAM_SIZE)),
    );

  const teamsQuery = db
    .with(eligible)
    .select({ id: team.id, name: team.name, captainId: team.captainId })
    .from(team)
    .innerJoin(eligible, eq(team.id, eligible.teamId))
    .orderBy(sql`${team.name} collate nocase`);

  const membersQuery = db
    .with(eligible)
    .select({
      id: participant.id,
      fullName: participant.fullName,
      iin: participant.iin,
      phone: participant.phone,
      teamId: participant.teamId,
      attended: participant.attended,
      placeOfStudy: participant.placeOfStudy,
      educationLevel: participant.educationLevel,
    })
    .from(participant)
    .innerJoin(eligible, eq(participant.teamId, eligible.teamId));

  const [teamRows, memberRows] = await db.batch([teamsQuery, membersQuery]);

  const membersByTeam = new Map<string, typeof memberRows>();
  for (const row of memberRows) {
    if (!row.teamId) continue;
    const list = membersByTeam.get(row.teamId) ?? [];
    list.push(row);
    membersByTeam.set(row.teamId, list);
  }

  const participants: CheckinParticipant[] = teamRows
    .flatMap((t) =>
      (membersByTeam.get(t.id) ?? []).map((m) => ({
        id: m.id,
        fullName: m.fullName,
        iin: m.iin,
        phone: m.phone,
        teamId: t.id,
        teamName: t.name,
        placeOfStudy: m.placeOfStudy,
        educationLevel: m.educationLevel,
        attended: m.attended,
      })),
    )
    .sort(byName);

  const teams: CheckinTeam[] = teamRows.map((t) => {
    const members = (membersByTeam.get(t.id) ?? [])
      .map((m) => ({ id: m.id, fullName: m.fullName, attended: m.attended }))
      .sort((a, b) => {
        if (a.id === t.captainId) return -1;
        if (b.id === t.captainId) return 1;
        return byName(a, b);
      });
    return {
      id: t.id,
      name: t.name,
      captainName: members.find((m) => m.id === t.captainId)?.fullName ?? '',
      members,
    };
  });

  return { participants, teams };
}

/** Mark a participant present or absent at the venue. */
export async function setAttendance(
  participantId: string,
  attended: boolean,
): Promise<{ id: string; attended: boolean }> {
  const db = getAppDb();
  const [row] = await db
    .update(participant)
    .set({ attended, updatedAt: new Date() })
    .where(eq(participant.id, participantId))
    .returning({ id: participant.id, attended: participant.attended });
  if (!row) throw new Error('Participant not found');
  return row;
}
