import { env } from 'cloudflare:workers';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { participant } from '@/db/schema';
import { onboardingSchema, type OnboardingInput } from '@/lib/validation';

interface AppEnv {
  DB: D1Database;
}

function getAppDb() {
  return getDb((env as unknown as AppEnv).DB);
}

/** The participant profile for a user, or undefined before onboarding. */
export async function getParticipant(userId: string) {
  const db = getAppDb();
  return db.query.participant.findFirst({ where: eq(participant.id, userId) });
}

/** Create or update a participant profile. Onboarding is re-runnable. */
export async function upsertParticipant(
  data: Omit<OnboardingInput, 'parentPhone'> & { userId: string; parentPhone?: string },
) {
  const db = getAppDb();
  const {
    consent: _consent,
    policyVersion,
    documentsRead: _documentsRead,
    documentsPolicyVersion,
    ...profile
  } = onboardingSchema.parse(data);
  const now = new Date();

  await db
    .insert(participant)
    .values({
      id: data.userId,
      ...profile,
      parentPhone: profile.parentPhone ?? null,
      consentedAt: now,
      consentPolicyVersion: policyVersion,
      documentsAcknowledgedAt: now,
      documentsPolicyVersion,
    })
    .onConflictDoUpdate({
      target: participant.id,
      set: {
        ...profile,
        parentPhone: profile.parentPhone ?? null,
        consentedAt: sql`case
          when ${participant.consentPolicyVersion} = ${policyVersion}
            then coalesce(${participant.consentedAt}, ${now.getTime()})
          else ${now.getTime()}
        end`,
        consentPolicyVersion: policyVersion,
        documentsAcknowledgedAt: sql`case
          when ${participant.documentsPolicyVersion} = ${documentsPolicyVersion}
            then coalesce(${participant.documentsAcknowledgedAt}, ${now.getTime()})
          else ${now.getTime()}
        end`,
        documentsPolicyVersion,
        updatedAt: now,
      },
    });
}
