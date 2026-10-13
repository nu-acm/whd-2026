import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:workers';
import { TestD1 } from '@/test/d1';
import { TEAM_ERRORS } from '@/lib/team-errors';
import {
  createTeam,
  dissolveTeam,
  getTeamByParticipant,
  joinTeamBySlug,
  kickMember,
  leaveTeam,
} from '@/lib/team.server';

let db: TestD1;

beforeEach(() => {
  db = new TestD1();
  Object.assign(env, { DB: db.binding });
  for (let i = 0; i < 6; i++) db.seedUser(`u${i}`);
});

afterEach(() => {
  db.close();
  delete (env as { DB?: D1Database }).DB;
});

const accepted = (results: PromiseSettledResult<unknown>[]) =>
  results.filter((result) => result.status === 'fulfilled');

describe('atomic team membership', () => {
  it('allows only one concurrent join into the last slot', async () => {
    const team = await createTeam('u0', 'Last Slot');
    await joinTeamBySlug('u1', team.inviteSlug);
    await joinTeamBySlug('u2', team.inviteSlug);
    const results = await Promise.allSettled([
      joinTeamBySlug('u3', team.inviteSlug),
      joinTeamBySlug('u4', team.inviteSlug),
      joinTeamBySlug('u5', team.inviteSlug),
    ]);
    expect(accepted(results)).toHaveLength(1);
    expect((await getTeamByParticipant('u0'))?.members).toHaveLength(4);
    for (const result of results) {
      if (result.status === 'rejected') expect(result.reason.message).toBe(TEAM_ERRORS.full);
    }
  });

  it('creates only one team for concurrent requests from one captain', async () => {
    const results = await Promise.allSettled([
      createTeam('u0', 'Team Alpha'),
      createTeam('u0', 'Team Beta'),
    ]);
    expect(accepted(results)).toHaveLength(1);
    const teams = db.sqlite.prepare('SELECT id FROM team').all();
    expect(teams).toHaveLength(1);
    expect((await getTeamByParticipant('u0'))?.id).toBe(teams[0].id);
  });

  it('does not overwrite membership when create and join race', async () => {
    const target = await createTeam('u0', 'Target Team');
    const results = await Promise.allSettled([
      createTeam('u1', 'New Team'),
      joinTeamBySlug('u1', target.inviteSlug),
    ]);
    expect(accepted(results)).toHaveLength(1);
    const empty = db.sqlite
      .prepare(
        `SELECT id FROM team
      WHERE NOT EXISTS (SELECT 1 FROM participant WHERE team_id = team.id)`,
      )
      .all();
    expect(empty).toHaveLength(0);
  });

  it('does not let one participant join two teams concurrently', async () => {
    const a = await createTeam('u0', 'First Team');
    const b = await createTeam('u1', 'Second Team');
    const results = await Promise.allSettled([
      joinTeamBySlug('u2', a.inviteSlug),
      joinTeamBySlug('u2', b.inviteSlug),
    ]);
    expect(accepted(results)).toHaveLength(1);
    for (const result of results) {
      if (result.status === 'rejected')
        expect(result.reason.message).toBe(TEAM_ERRORS.alreadyInTeam);
    }
  });

  it('rolls back a team insert if assigning the captain fails', async () => {
    db.failWhen = (query) => /update "participant" set "team_id"/i.test(query);
    await expect(createTeam('u0', 'Rollback Team')).rejects.toThrow('Injected database failure');
    expect(db.sqlite.prepare('SELECT id FROM team').all()).toHaveLength(0);
    expect(await getTeamByParticipant('u0')).toBeNull();
  });

  it('retries invite-slug collisions from different concurrent names', async () => {
    const results = await Promise.all([
      createTeam('u0', 'Same Slug!'),
      createTeam('u1', 'Same Slug?'),
    ]);
    expect(new Set(results.map((team) => team.inviteSlug)).size).toBe(2);
  });

  it('rejects duplicate canonical names even when the creates race', async () => {
    const results = await Promise.allSettled([
      createTeam('u0', 'Same Name'),
      createTeam('u1', 'SAME  NAME'),
    ]);
    expect(accepted(results)).toHaveLength(1);
    for (const result of results) {
      if (result.status === 'rejected') expect(result.reason.message).toBe(TEAM_ERRORS.nameTaken);
    }
  });

  it('requires a profile and returns a translated key for a missing invite', async () => {
    db.seedUser('not-onboarded', false);
    await expect(createTeam('not-onboarded', 'No Profile')).rejects.toThrow(TEAM_ERRORS.noProfile);
    await expect(joinTeamBySlug('u0', 'nonexistent')).rejects.toThrow(TEAM_ERRORS.invalidInvite);
  });

  it('keeps captain permissions and detaches everyone on dissolution', async () => {
    const team = await createTeam('u0', 'Lifecycle Team');
    await joinTeamBySlug('u1', team.inviteSlug);
    await joinTeamBySlug('u2', team.inviteSlug);
    await expect(leaveTeam('u0')).rejects.toThrow(TEAM_ERRORS.captainCannotLeave);
    await expect(kickMember('u1', 'u2')).rejects.toThrow(TEAM_ERRORS.captainOnlyRemove);
    await expect(dissolveTeam('u1')).rejects.toThrow(TEAM_ERRORS.captainOnlyDissolve);
    await kickMember('u0', 'u1');
    expect(await getTeamByParticipant('u1')).toBeNull();
    await dissolveTeam('u0');
    expect(await getTeamByParticipant('u0')).toBeNull();
    expect(await getTeamByParticipant('u2')).toBeNull();
    expect(db.sqlite.prepare('SELECT id FROM team').all()).toHaveLength(0);
  });
});
