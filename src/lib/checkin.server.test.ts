import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { env } from 'cloudflare:workers';
import { TestD1 } from '@/test/d1';
import { getCheckinData, setAttendance } from './checkin.server';
import { createTeam, joinTeamBySlug } from './team.server';

let db: TestD1;
beforeEach(() => {
  db = new TestD1();
  Object.assign(env, { DB: db.binding });
  for (let i = 0; i < 7; i++) db.seedUser(`u${i}`);
});
afterEach(() => {
  db.close();
  delete (env as { DB?: D1Database }).DB;
});

describe('check-in roster', () => {
  it('excludes teamless participants and teams below the three-member minimum', async () => {
    const eligible = await createTeam('u0', 'Eligible Team');
    await joinTeamBySlug('u1', eligible.inviteSlug);
    expect(await getCheckinData()).toEqual({ teams: [], participants: [] });
    await joinTeamBySlug('u2', eligible.inviteSlug);
    const small = await createTeam('u3', 'Small Team');
    await joinTeamBySlug('u4', small.inviteSlug);
    const data = await getCheckinData();
    expect(data.teams.map((t) => t.id)).toEqual([eligible.id]);
    expect(data.participants.map((p) => p.id)).toEqual(['u0', 'u1', 'u2']);
    expect(data.teams[0].members).toHaveLength(3);
  });

  it('orders the captain before other members and persists attendance toggles', async () => {
    const team = await createTeam('u2', 'Ordered Team');
    await joinTeamBySlug('u1', team.inviteSlug);
    await joinTeamBySlug('u0', team.inviteSlug);
    expect(await setAttendance('u1', true)).toEqual({ id: 'u1', attended: true });
    const data = await getCheckinData();
    expect(data.teams[0].members.map((m) => m.id)).toEqual(['u2', 'u0', 'u1']);
    expect(data.teams[0].captainName).toBe('u2');
    expect(data.participants.find((p) => p.id === 'u1')?.attended).toBe(true);
    await setAttendance('u1', false);
    expect((await getCheckinData()).teams[0].members.find((m) => m.id === 'u1')?.attended).toBe(
      false,
    );
  });

  it('rejects attendance updates for unknown participants', async () => {
    await expect(setAttendance('missing', true)).rejects.toThrow('Participant not found');
  });
});
