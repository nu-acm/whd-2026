import { expect, it } from 'vite-plus/test';
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

it('admits exactly one competing join into the final team slot', async () => {
  for (let i = 0; i < 6; i++) await seedParticipant(`u${i}`);
  const team = await createTeam('u0', 'Final Slot');
  await joinTeamBySlug('u1', team.inviteSlug);
  await joinTeamBySlug('u2', team.inviteSlug);
  const results = await Promise.allSettled(
    ['u3', 'u4', 'u5'].map((id) => joinTeamBySlug(id, team.inviteSlug)),
  );
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect((await getTeamByParticipant('u0'))?.members).toHaveLength(4);
  for (const result of results) {
    if (result.status === 'rejected')
      expect(result.reason).toMatchObject({ message: TEAM_ERRORS.full });
  }
});

it('keeps one membership when team creation competes with joining', async () => {
  await seedParticipant('captain');
  await seedParticipant('member');
  const target = await createTeam('captain', 'Existing Team');
  const results = await Promise.allSettled([
    createTeam('member', 'New Team'),
    joinTeamBySlug('member', target.inviteSlug),
  ]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(await getTeamByParticipant('member')).not.toBeNull();
  const empty = await bindings.DB.prepare(
    'SELECT id FROM team WHERE NOT EXISTS (SELECT 1 FROM participant WHERE team_id = team.id)',
  ).all();
  expect(empty.results).toHaveLength(0);
});

it('rejects competing canonical names and gives distinct slugs to different names', async () => {
  for (const id of ['a', 'b', 'c', 'd']) await seedParticipant(id);
  const results = await Promise.allSettled([
    createTeam('a', 'Қыздар Коды'),
    createTeam('b', 'ҚЫЗДАР  КОДЫ'),
  ]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.find((result) => result.status === 'rejected')).toMatchObject({
    reason: { message: TEAM_ERRORS.nameTaken },
  });
  const teams = await Promise.all([createTeam('c', 'Same Slug!'), createTeam('d', 'Same Slug?')]);
  expect(new Set(teams.map((team) => team.inviteSlug)).size).toBe(2);
});

it('rolls back creation when D1 rejects the captain assignment', async () => {
  await seedParticipant('captain');
  await bindings.DB.prepare(
    "CREATE TRIGGER reject_assignment BEFORE UPDATE OF team_id ON participant WHEN NEW.team_id IS NOT NULL BEGIN SELECT RAISE(ABORT, 'assignment rejected'); END",
  ).run();
  try {
    await expect(createTeam('captain', 'Rollback Team')).rejects.toThrow();
    expect((await bindings.DB.prepare('SELECT id FROM team').all()).results).toHaveLength(0);
    expect(await getTeamByParticipant('captain')).toBeNull();
  } finally {
    await bindings.DB.prepare('DROP TRIGGER reject_assignment').run();
  }
});

it('enforces captain permissions and detaches members on dissolution', async () => {
  for (const id of ['captain', 'member', 'other']) await seedParticipant(id);
  const team = await createTeam('captain', 'Lifecycle Team');
  await joinTeamBySlug('member', team.inviteSlug);
  await joinTeamBySlug('other', team.inviteSlug);
  await expect(leaveTeam('captain')).rejects.toThrow(TEAM_ERRORS.captainCannotLeave);
  await expect(kickMember('member', 'other')).rejects.toThrow(TEAM_ERRORS.captainOnlyRemove);
  await expect(dissolveTeam('member')).rejects.toThrow(TEAM_ERRORS.captainOnlyDissolve);
  await kickMember('captain', 'other');
  expect(await getTeamByParticipant('other')).toBeNull();
  await dissolveTeam('captain');
  expect(await getTeamByParticipant('captain')).toBeNull();
  expect(await getTeamByParticipant('member')).toBeNull();
});
