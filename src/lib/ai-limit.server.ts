import { env } from 'cloudflare:workers';
import { and, lt, lte, or, sql } from 'drizzle-orm';
import { aiGenerationLimit, getDb } from '@/db';
import {
  AI_COOLDOWN_MS,
  AI_RATE_LIMIT_ERROR,
  AI_REQUESTS_PER_WINDOW,
  AI_WINDOW_MS,
} from '@/lib/ai';

/** Claim an allowance atomically before starting remote inference. */
export async function claimTeamNameGeneration(userId: string) {
  const { DB } = env as unknown as { DB: D1Database };
  const db = getDb(DB);
  const now = Date.now();
  const windowExpired = lte(aiGenerationLimit.windowStartedAt, now - AI_WINDOW_MS);
  const results = await db
    .insert(aiGenerationLimit)
    .values({
      userId,
      nextAllowedAt: now + AI_COOLDOWN_MS,
      windowStartedAt: now,
      requests: 1,
    })
    .onConflictDoUpdate({
      target: aiGenerationLimit.userId,
      set: {
        nextAllowedAt: now + AI_COOLDOWN_MS,
        windowStartedAt: sql`case when ${windowExpired} then ${now} else ${aiGenerationLimit.windowStartedAt} end`,
        requests: sql`case when ${windowExpired} then 1 else ${aiGenerationLimit.requests} + 1 end`,
      },
      setWhere: and(
        lte(aiGenerationLimit.nextAllowedAt, now),
        or(windowExpired, lt(aiGenerationLimit.requests, AI_REQUESTS_PER_WINDOW)),
      ),
    })
    .returning({ userId: aiGenerationLimit.userId });
  if (!results.length) throw new Error(AI_RATE_LIMIT_ERROR);
}
