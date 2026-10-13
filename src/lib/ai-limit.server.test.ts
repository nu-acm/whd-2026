import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from 'cloudflare:workers';
import { TestD1 } from '@/test/d1';
import { AI_COOLDOWN_MS, AI_RATE_LIMIT_ERROR, AI_REQUESTS_PER_WINDOW, AI_WINDOW_MS } from './ai';
import { claimTeamNameGeneration } from './ai-limit.server';
import { generateTeamNameForParticipant } from './ai.server';
import { REGISTRATION_CLOSED_I18N_KEY } from './registration.server';
import { TEAM_ERRORS } from './team-errors';
import { createTeam } from './team.server';

let db: TestD1;
const run = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-13T08:00:00Z'));
  db = new TestD1();
  db.seedUser('u0');
  Object.assign(env, { DB: db.binding, AI: { run } });
  run.mockReset().mockResolvedValue({ choices: [{ message: { content: 'Byte Bloom' } }] });
});

afterEach(() => {
  db.close();
  for (const key of ['DB', 'AI', 'REGISTRATION_DEADLINE']) {
    delete (env as Record<string, unknown>)[key];
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('server-side team name limits', () => {
  it('allows only one simultaneous request to reach Workers AI', async () => {
    const results = await Promise.allSettled([
      generateTeamNameForParticipant('u0'),
      generateTeamNameForParticipant('u0'),
      generateTeamNameForParticipant('u0'),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(run).toHaveBeenCalledTimes(1);
    for (const result of results) {
      if (result.status === 'rejected') expect(result.reason.message).toBe(AI_RATE_LIMIT_ERROR);
    }
  });

  it('enforces the cooldown at its exact boundary and allows different users', async () => {
    db.seedUser('u1');
    await claimTeamNameGeneration('u0');
    await claimTeamNameGeneration('u1');
    vi.advanceTimersByTime(AI_COOLDOWN_MS - 1);
    await expect(claimTeamNameGeneration('u0')).rejects.toThrow(AI_RATE_LIMIT_ERROR);
    vi.advanceTimersByTime(1);
    await expect(claimTeamNameGeneration('u0')).resolves.toBeUndefined();
  });

  it('caps hourly usage and resets the allowance when the window expires', async () => {
    const start = Date.now();
    for (let i = 0; i < AI_REQUESTS_PER_WINDOW; i++) {
      await claimTeamNameGeneration('u0');
      vi.advanceTimersByTime(AI_COOLDOWN_MS);
    }
    await expect(claimTeamNameGeneration('u0')).rejects.toThrow(AI_RATE_LIMIT_ERROR);
    vi.setSystemTime(start + AI_WINDOW_MS);
    await expect(claimTeamNameGeneration('u0')).resolves.toBeUndefined();
    expect(db.sqlite.prepare('SELECT requests FROM ai_generation_limit').get()?.requests).toBe(1);
  });

  it('rejects closed registration without calling AI or consuming an allowance', async () => {
    Object.assign(env, { REGISTRATION_DEADLINE: '2026-10-01T00:00:00Z' });
    await expect(generateTeamNameForParticipant('u0')).rejects.toThrow(
      REGISTRATION_CLOSED_I18N_KEY,
    );
    expect(run).not.toHaveBeenCalled();
    expect(db.sqlite.prepare('SELECT * FROM ai_generation_limit').all()).toHaveLength(0);
  });

  it('requires a complete profile and a participant without a team', async () => {
    db.seedUser('not-onboarded', false);
    await expect(generateTeamNameForParticipant('not-onboarded')).rejects.toThrow(
      TEAM_ERRORS.noProfile,
    );
    await createTeam('u0', 'Existing Team');
    await expect(generateTeamNameForParticipant('u0')).rejects.toThrow(TEAM_ERRORS.alreadyInTeam);
    expect(run).not.toHaveBeenCalled();
  });

  it('keeps failed inference within the allowance and returns a safe error key', async () => {
    run.mockRejectedValue(new Error('Remote service unavailable'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(generateTeamNameForParticipant('u0')).rejects.toThrow('dashboard.generateFailed');
    await expect(generateTeamNameForParticipant('u0')).rejects.toThrow(AI_RATE_LIMIT_ERROR);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
