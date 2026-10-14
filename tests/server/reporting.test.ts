import { expect, it, vi } from 'vite-plus/test';
import { getCheckinData, setAttendance } from '@/lib/checkin.server';
import { getReportData, participantsToCsv } from '@/lib/report.server';
import { createTeam, joinTeamBySlug } from '@/lib/team.server';
import { Route } from '@/routes/api/report';
import { generateTeamNameForParticipant } from '@/lib/ai.server';
import { AI_RATE_LIMIT_ERROR } from '@/lib/ai';
import { getRegistrationStatus, isRegistrationOpen } from '@/lib/registration.server';
import { DEFAULT_REGISTRATION_DEADLINE } from '@/lib/registration';
import { bindings, seedParticipant } from './support';

it('reports joined rosters and attendance, checking in only eligible teams', async () => {
  for (const id of ['captain', 'member', 'third', 'small', 'solo']) await seedParticipant(id);
  const eligible = await createTeam('captain', 'Eligible Team');
  await joinTeamBySlug('member', eligible.inviteSlug);
  await joinTeamBySlug('third', eligible.inviteSlug);
  await createTeam('small', 'Small Team');
  await setAttendance('member', true);
  const report = await getReportData();
  expect(report.stats).toEqual({
    participants: 5,
    teams: 2,
    eligibleTeams: 1,
    teamless: 1,
    attended: 1,
  });
  expect(report.participants.find((p) => p.id === 'member')).toMatchObject({
    email: 'member@example.test',
    attended: true,
    teamEligible: true,
    teamSlug: eligible.inviteSlug,
  });
  const checkin = await getCheckinData();
  expect(checkin.participants.map((p) => p.id).sort()).toEqual(['captain', 'member', 'third']);
  expect(checkin.teams[0].members[0].id).toBe('captain');
  await expect(setAttendance('missing', true)).rejects.toThrow('Participant not found');
});

it('requires the report secret and returns actual data only to authorized requests', async () => {
  await seedParticipant('owner');
  const handlers = Route.options.server?.handlers;
  if (!handlers || typeof handlers === 'function' || !handlers.POST)
    throw new Error('Report handlers are required');
  const postHandler = handlers.POST;
  async function post(body: string) {
    const response = await postHandler({
      request: new Request(`${bindings.BETTER_AUTH_URL}/api/report`, { method: 'POST', body }),
      params: {},
      pathname: '/api/report',
      context: undefined,
      next: vi.fn(),
    });
    if (!(response instanceof Response)) throw new Error('Expected an HTTP response');
    return response;
  }
  expect((await post('invalid JSON')).status).toBe(400);
  for (const secret of ['', 'wrong', null])
    expect((await post(JSON.stringify({ secret }))).status).toBe(401);
  const response = await post(JSON.stringify({ secret: bindings.GAS_SECRET }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(await getReportData());
});

it('escapes CSV fields, neutralizes formulas, and preserves leading-zero identifiers', async () => {
  await seedParticipant('owner');
  const [row] = (await getReportData()).participants;
  const csv = participantsToCsv([
    { ...row, fullName: 'Ada, "A"\nName', city: '=SUM(1,2)', iin: '001234567890' },
  ]);
  expect(csv).toContain('"Ada, ""A""\nName"');
  expect(csv).toContain('"\'=SUM(1,2)"');
  expect(csv).toContain("'001234567890");
});

it('shares the event deadline between status and server checks, closing at the boundary', () => {
  bindings.REGISTRATION_DEADLINE = '';
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(DEFAULT_REGISTRATION_DEADLINE).getTime() - 1);
  expect(isRegistrationOpen()).toBe(true);
  expect(getRegistrationStatus().deadline).toBe(
    new Date(DEFAULT_REGISTRATION_DEADLINE).toISOString(),
  );
  vi.setSystemTime(new Date(DEFAULT_REGISTRATION_DEADLINE));
  expect(isRegistrationOpen()).toBe(false);
  expect(getRegistrationStatus().open).toBe(false);
});

it('claims paid AI allowances atomically and refuses generation after closure', async () => {
  await seedParticipant('owner');
  const run = vi.fn().mockResolvedValue({ choices: [{ message: { content: 'Binary Blossoms' } }] });
  bindings.AI = { run };
  const results = await Promise.allSettled([
    generateTeamNameForParticipant('owner'),
    generateTeamNameForParticipant('owner'),
  ]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.find((result) => result.status === 'rejected')).toMatchObject({
    reason: { message: AI_RATE_LIMIT_ERROR },
  });
  expect(run).toHaveBeenCalledTimes(1);
  bindings.REGISTRATION_DEADLINE = '2000-01-01T00:00:00Z';
  await expect(generateTeamNameForParticipant('owner')).rejects.toThrow(
    'onboarding.registrationClosedError',
  );
  expect(run).toHaveBeenCalledTimes(1);
});
