import { expect, it } from 'vite-plus/test';
import { finalizeTeams, getProctoringCsv, setTeamUnconfirmed } from '@/lib/contest.server';
import { CONTEST_ERRORS } from '@/lib/contest';
import { getCheckinData } from '@/lib/checkin.server';
import { getReportData, participantsToCsv } from '@/lib/report.server';
import {
  createTeam,
  dissolveTeam,
  getTeamByParticipant,
  joinTeamBySlug,
  kickMember,
  leaveTeam,
} from '@/lib/team.server';
import { TEAM_ERRORS } from '@/lib/team-errors';
import { bindings, seedParticipant } from './support';

/** A team of `size` members whose ids start with `prefix`; the first one is the captain. */
async function seedTeam(prefix: string, name: string, size = 3) {
  const ids = Array.from({ length: size }, (_, i) => `${prefix}${i}`);
  for (const id of ids) await seedParticipant(id);
  const team = await createTeam(ids[0], name);
  for (const id of ids.slice(1)) await joinTeamBySlug(id, team.inviteSlug);
  return { ...team, ids };
}

const closeRegistration = () => {
  bindings.REGISTRATION_DEADLINE = '2000-01-01T00:00:00Z';
};

async function numbers() {
  const rows = await bindings.DB.prepare(
    'SELECT name, number, contest_password FROM team ORDER BY name',
  ).all<{ name: string; number: number | null; contest_password: string | null }>();
  return rows.results;
}

it('numbers eligible, confirmed teams once registration closes, and appends later ones', async () => {
  const alpha = await seedTeam('a', 'Alpha');
  const beta = await seedTeam('b', 'Beta');
  const gamma = await seedTeam('c', 'Gamma');
  await seedTeam('s', 'Small', 2);
  await setTeamUnconfirmed(gamma.inviteSlug, true);

  await expect(finalizeTeams()).rejects.toThrow(CONTEST_ERRORS.registrationOpen);
  closeRegistration();
  expect(await finalizeTeams()).toEqual({ assigned: 2, badNames: [] });

  const first = await numbers();
  const numbered = first.filter((t) => t.number !== null);
  expect(numbered.map((t) => t.name).sort()).toEqual(['Alpha', 'Beta']);
  expect(numbered.map((t) => t.number).sort((x, y) => (x ?? 0) - (y ?? 0))).toEqual([1, 2]);
  for (const t of numbered) expect(t.contest_password).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);

  // Clicking again changes nothing; a numbered team can no longer be unconfirmed.
  expect(await finalizeTeams()).toEqual({ assigned: 0, badNames: [] });
  expect(await numbers()).toEqual(first);
  await expect(setTeamUnconfirmed(alpha.inviteSlug, true)).rejects.toThrow(TEAM_ERRORS.finalized);
  await expect(setTeamUnconfirmed('missing', true)).rejects.toThrow(TEAM_ERRORS.notFound);

  // A team confirmed after all gets the next number.
  await setTeamUnconfirmed(gamma.inviteSlug, false);
  expect(await finalizeTeams()).toEqual({ assigned: 1, badNames: [] });
  expect((await numbers()).find((t) => t.name === 'Gamma')?.number).toBe(3);
  expect((await getTeamByParticipant(beta.ids[1]))?.contest).not.toBeNull();
});

it('never repeats a number or leaves a gap when organisers finalize at the same time', async () => {
  for (let i = 0; i < 6; i++) await seedTeam(`t${i}-`, `Team ${i}`);
  closeRegistration();
  const results = await Promise.all([finalizeTeams(), finalizeTeams(), finalizeTeams()]);
  expect(results.reduce((sum, r) => sum + r.assigned, 0)).toBe(6);
  const rows = await numbers();
  expect(rows.map((t) => t.number).sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([1, 2, 3, 4, 5, 6]);
  expect(new Set(rows.map((t) => t.contest_password)).size).toBe(6);
});

it('refuses to finalize while a team name would break the Codeforces users file', async () => {
  const team = await seedTeam('p', 'Pipe Team');
  await bindings.DB.prepare('UPDATE team SET name = ? WHERE id = ?')
    .bind('Pipe | Team', team.id)
    .run();
  closeRegistration();
  expect(await finalizeTeams()).toEqual({ assigned: 0, badNames: ['Pipe | Team'] });
  expect((await numbers())[0].number).toBeNull();
});

it('leaves a previously oversized team without a number, as check-in does', async () => {
  const team = await seedTeam('o', 'Oversized');
  await seedParticipant('fourth');
  await bindings.DB.prepare('UPDATE participant SET team_id = ? WHERE id = ?')
    .bind(team.id, 'fourth')
    .run();
  closeRegistration();
  expect(await finalizeTeams()).toEqual({ assigned: 0, badNames: [] });
  expect((await numbers())[0].number).toBeNull();
  expect((await getReportData()).stats.awaitingNumber).toBe(0);
});

it('freezes the roster of a numbered team', async () => {
  const team = await seedTeam('f', 'Frozen');
  await seedParticipant('late');
  closeRegistration();
  await finalizeTeams();
  // The server functions also refuse once registration is closed; these checks hold regardless.
  await expect(joinTeamBySlug('late', team.inviteSlug)).rejects.toThrow(TEAM_ERRORS.finalized);
  await expect(leaveTeam('f1')).rejects.toThrow(TEAM_ERRORS.finalized);
  await expect(kickMember('f0', 'f2')).rejects.toThrow(TEAM_ERRORS.finalized);
  await expect(dissolveTeam('f0')).rejects.toThrow(TEAM_ERRORS.finalized);
  expect((await getTeamByParticipant('f0'))?.members).toHaveLength(3);
});

it('shows the contest card only to members of a numbered team, whatever the deadline or time', async () => {
  const team = await seedTeam('m', 'Members');
  await seedParticipant('outsider');
  expect((await getTeamByParticipant('m0'))?.contest).toBeNull();
  closeRegistration();
  await finalizeTeams();
  const password = (await numbers())[0].contest_password;
  const expected = {
    tableNumber: '01',
    login: 'team01',
    password,
    uploadUrl: `https://proctoring.example.test/#team=${password}`,
    contestStart: null,
  };
  for (const id of team.ids) expect((await getTeamByParticipant(id))?.contest).toEqual(expected);
  expect(await getTeamByParticipant('outsider')).toBeNull();

  // Reopening registration or reaching the contest start never hides it.
  bindings.REGISTRATION_DEADLINE = '2099-01-01T00:00:00Z';
  bindings.CONTEST_START = '2026-11-14T12:00:00+05:00';
  try {
    expect((await getTeamByParticipant('m1'))?.contest).toEqual({
      ...expected,
      contestStart: '2026-11-14T07:00:00.000Z',
    });
  } finally {
    bindings.CONTEST_START = '';
  }
});

it('exports numbered teams for proctoring and keeps passwords out of the report', async () => {
  const quoted = await seedTeam('q', 'Bits, "Bytes"');
  await seedTeam('u', 'Unnumbered', 2);
  closeRegistration();
  await finalizeTeams();
  const [{ contest_password: password }] = (await numbers()).filter((t) => t.number !== null);

  expect(await getProctoringCsv()).toBe(
    `id,number,login,code,name\n${quoted.id},1,team01,${password},"Bits, ""Bytes"""`,
  );

  const report = await getReportData();
  expect(JSON.stringify(report)).not.toContain(password);
  expect(report.stats).toMatchObject({ numberedTeams: 1, awaitingNumber: 0 });
  expect(report.teams.find((t) => t.name === 'Bits, "Bytes"')).toMatchObject({
    number: 1,
    unconfirmed: false,
  });
  const csv = participantsToCsv(report.participants);
  expect(csv).not.toContain(password);
  expect(csv.split('\n')[0]).toContain('Team,Team number,Attended');

  const checkin = await getCheckinData();
  expect(checkin.teams.map((t) => t.number)).toEqual([1]);
  expect(new Set(checkin.participants.map((p) => p.teamNumber))).toEqual(new Set([1]));
});
