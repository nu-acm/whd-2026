import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { env } from 'cloudflare:workers';
import { TestD1 } from '@/test/d1';
import { getReportData } from './report.server';
import { createTeam, joinTeamBySlug } from './team.server';
import { setAttendance } from './checkin.server';

let db: TestD1;
beforeEach(() => {
  db = new TestD1();
  Object.assign(env, { DB: db.binding });
});
afterEach(() => {
  db.close();
  delete (env as { DB?: D1Database }).DB;
});

describe('report queries', () => {
  it('returns empty rosters and zero statistics for an empty database', async () => {
    expect(await getReportData()).toEqual({
      participants: [],
      teams: [],
      stats: { participants: 0, teams: 0, eligibleTeams: 0, teamless: 0, attended: 0 },
    });
  });

  it('joins profiles, teams and emails and computes eligibility and attendance', async () => {
    for (let i = 0; i < 6; i++) db.seedUser(`u${i}`);
    const eligible = await createTeam('u2', 'Eligible Team');
    await joinTeamBySlug('u0', eligible.inviteSlug);
    await joinTeamBySlug('u1', eligible.inviteSlug);
    const small = await createTeam('u3', 'Small Team');
    await joinTeamBySlug('u4', small.inviteSlug);
    await setAttendance('u0', true);
    const report = await getReportData();
    expect(report.stats).toEqual({
      participants: 6,
      teams: 2,
      eligibleTeams: 1,
      teamless: 1,
      attended: 1,
    });
    expect(report.teams.find((t) => t.inviteSlug === eligible.inviteSlug)).toMatchObject({
      captainName: 'u2',
      eligible: true,
      memberCount: 3,
    });
    expect(report.teams.find((t) => t.inviteSlug === eligible.inviteSlug)?.members[0].id).toBe(
      'u2',
    );
    expect(report.teams.find((t) => t.inviteSlug === small.inviteSlug)?.eligible).toBe(false);
    expect(report.participants.find((p) => p.id === 'u0')).toMatchObject({
      email: 'u0@example.com',
      teamName: eligible.name,
      teamSlug: eligible.inviteSlug,
      teamEligible: true,
      attended: true,
    });
    expect(report.participants.find((p) => p.id === 'u5')).toMatchObject({
      teamName: null,
      teamSlug: null,
      teamEligible: false,
    });
    for (const row of [...report.participants, ...report.teams]) {
      expect(new Date(row.createdAt).toISOString()).toBe(row.createdAt);
    }
  });
});
