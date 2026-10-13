import { afterEach, describe, expect, it, vi } from 'vitest';

const { env } = vi.hoisted(() => ({ env: {} as { REGISTRATION_DEADLINE?: string } }));
vi.mock('cloudflare:workers', () => ({ env }));

import { getRegistrationDeadline, getRegistrationStatus } from './registration.server';

afterEach(() => {
  delete env.REGISTRATION_DEADLINE;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('WHD registration deadline', () => {
  it('uses the confirmed end of October 20 in Astana without an env override', () => {
    expect(getRegistrationDeadline().toISOString()).toBe('2026-10-20T18:59:59.000Z');
  });

  it('closes registration at the same instant displayed by the countdown', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-20T18:59:58.999Z'));
    expect(getRegistrationStatus().open).toBe(true);
    vi.setSystemTime(new Date('2026-10-20T18:59:59.000Z'));
    expect(getRegistrationStatus().open).toBe(false);
  });

  it('respects an explicitly configured deadline', () => {
    env.REGISTRATION_DEADLINE = '2026-10-19T12:00:00Z';
    expect(getRegistrationDeadline().toISOString()).toBe('2026-10-19T12:00:00.000Z');
  });

  it('keeps the confirmed deadline if the override is invalid', () => {
    env.REGISTRATION_DEADLINE = 'invalid';
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(getRegistrationDeadline().toISOString()).toBe('2026-10-20T18:59:59.000Z');
  });
});
