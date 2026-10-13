import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:workers';
import { TestD1 } from '@/test/d1';
import { getParticipant, upsertParticipant } from './onboarding.server';
import { createTeam } from './team.server';
import { setAttendance } from './checkin.server';

let db: TestD1;
const profile = {
  userId: 'u0',
  fullName: 'Aruzhan Sadykova',
  iin: '050919501086',
  phone: '77001234567',
  city: 'Astana',
  placeOfStudy: 'NU',
  educationLevel: "Bachelor's",
};

beforeEach(() => {
  db = new TestD1();
  db.seedUser('u0', false);
  Object.assign(env, { DB: db.binding });
});
afterEach(() => {
  db.close();
  delete (env as { DB?: D1Database }).DB;
});

describe('profile persistence', () => {
  it('returns no profile before onboarding and persists the supplied details', async () => {
    expect(await getParticipant('u0')).toBeUndefined();
    await upsertParticipant(profile);
    expect(await getParticipant('u0')).toMatchObject({
      id: 'u0',
      fullName: profile.fullName,
      iin: profile.iin,
      phone: profile.phone,
      parentPhone: null,
      teamId: null,
      attended: false,
    });
  });

  it('updates details without resetting team, attendance, CV, or registration date', async () => {
    await upsertParticipant({ ...profile, parentPhone: '77007654321' });
    const team = await createTeam('u0', 'Profile Team');
    await setAttendance('u0', true);
    db.sqlite
      .prepare('UPDATE participant SET cv_url = ? WHERE id = ?')
      .run('https://drive.google.com/file/d/oldCvFile123/view', 'u0');
    const before = await getParticipant('u0');
    await upsertParticipant({ ...profile, city: 'Almaty', fullName: 'Updated Name' });
    const after = await getParticipant('u0');
    expect(after).toMatchObject({
      city: 'Almaty',
      fullName: 'Updated Name',
      parentPhone: null,
      teamId: team.id,
      attended: true,
      cvUrl: before?.cvUrl,
      createdAt: before?.createdAt,
    });
    expect(db.sqlite.prepare('SELECT id FROM participant').all()).toHaveLength(1);
  });
});
