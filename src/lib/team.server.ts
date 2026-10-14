import { env } from 'cloudflare:workers';
import { and, eq, exists, isNull, lt, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { team, participant, MAX_TEAM_SIZE } from '@/db/schema';
import { TEAM_ERRORS } from '@/lib/team-errors';

interface AppEnv {
  DB: D1Database;
}

function getAppDb() {
  return getDb((env as unknown as AppEnv).DB);
}

// ── Slug helpers ─────────────────────────────────────────────────────────────

/** Cyrillic → Latin, including the Kazakh-specific letters. */
const CYRILLIC_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'z',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 's',
  ч: 'c',
  ш: 's',
  щ: 's',
  ъ: 'j',
  ы: 'y',
  ь: 'y',
  э: 'e',
  ю: 'u',
  я: 'a',
  ә: 'a',
  ғ: 'g',
  қ: 'k',
  ң: 'n',
  ө: 'o',
  ұ: 'u',
  ү: 'u',
  һ: 'h',
  і: 'i',
};

function transliterate(s: string): string {
  return s.replace(/[Ѐ-ӿ]/g, (ch) => CYRILLIC_MAP[ch] ?? ch);
}

/**
 * Turn a team name into a URL-safe ASCII slug.
 * "Команда Альфа" → "komanda-alyfa"; "Cool Hackers!!" → "cool-hackers"
 */
function slugify(name: string): string {
  return transliterate(name.trim().toLowerCase())
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Normalize a name for uniqueness checks, so "Binary  Blossoms" and
 * "binary blossoms" collide while the display name is preserved as typed.
 */
function canonicalizeTeamName(name: string): string {
  return name.trim().normalize('NFKC').toLowerCase().replace(/\s+/g, ' ');
}

/** Unique invite slug, appending -2, -3 … on collision. */
async function generateUniqueSlug(name: string): Promise<string> {
  const db = getAppDb();
  const base = slugify(name);

  if (!base) throw new Error(TEAM_ERRORS.nameNeedsLetters);

  const existing = await db.query.team.findFirst({
    where: eq(team.inviteSlug, base),
    columns: { id: true },
  });
  if (!existing) return base;

  for (let i = 2; i <= 11; i++) {
    const candidate = `${base}-${i}`;
    const collision = await db.query.team.findFirst({
      where: eq(team.inviteSlug, candidate),
      columns: { id: true },
    });
    if (!collision) return candidate;
  }

  throw new Error(TEAM_ERRORS.slugUnavailable);
}

// ── Types ────────────────────────────────────────────────────────────────────

export type TeamMember = {
  id: string;
  fullName: string;
  isCaptain: boolean;
};

export type TeamData = {
  id: string;
  name: string;
  inviteSlug: string;
  captainId: string;
  members: TeamMember[];
};

// ── Queries ──────────────────────────────────────────────────────────────────

/** The participant's team with all members, or null when they have none. */
export async function getTeamByParticipant(userId: string): Promise<TeamData | null> {
  const db = getAppDb();

  const p = await db.query.participant.findFirst({
    where: eq(participant.id, userId),
    columns: { teamId: true },
  });
  if (!p?.teamId) return null;

  const t = await db.query.team.findFirst({
    where: eq(team.id, p.teamId),
    with: { members: { columns: { id: true, fullName: true } } },
  });
  if (!t) return null;

  return {
    id: t.id,
    name: t.name,
    inviteSlug: t.inviteSlug,
    captainId: t.captainId,
    members: t.members.map((m) => ({
      id: m.id,
      fullName: m.fullName,
      isCaptain: m.id === t.captainId,
    })),
  };
}

/** Public summary of a team behind an invite link, for the join screen. */
export async function getTeamBySlug(slug: string) {
  const db = getAppDb();
  const t = await db.query.team.findFirst({
    where: eq(team.inviteSlug, slug),
    with: { members: { columns: { id: true } } },
  });
  if (!t) return null;
  return {
    id: t.id,
    name: t.name,
    memberCount: t.members.length,
    isFull: t.members.length >= MAX_TEAM_SIZE,
  };
}

// ── Mutations ────────────────────────────────────────────────────────────────

/** Create a team; the creator becomes captain. */
export async function createTeam(userId: string, name: string): Promise<TeamData> {
  const db = getAppDb();
  const canonicalName = canonicalizeTeamName(name);

  const p = await db.query.participant.findFirst({
    where: eq(participant.id, userId),
    columns: { id: true, teamId: true },
  });
  if (!p) throw new Error(TEAM_ERRORS.noProfile);
  if (p.teamId) throw new Error(TEAM_ERRORS.alreadyInTeam);

  const existing = await db.query.team.findFirst({
    where: eq(team.nameCanonical, canonicalName),
    columns: { id: true },
  });
  if (existing) throw new Error(TEAM_ERRORS.nameTaken);

  const id = crypto.randomUUID();
  const now = new Date();

  // D1 batches are transactions. Only insert while the captain is teamless,
  // then attach her in the same batch so no other create/join can intervene.
  for (let attempt = 0; attempt < 11; attempt++) {
    const inviteSlug = await generateUniqueSlug(name);
    try {
      const [insert] = await db.batch([
        db
          .insert(team)
          .select(
            db
              .select({
                id: sql<string>`${id}`.as('id'),
                name: sql<string>`${name}`.as('name'),
                nameCanonical: sql<string>`${canonicalName}`.as('name_canonical'),
                inviteSlug: sql<string>`${inviteSlug}`.as('invite_slug'),
                captainId: participant.id,
                createdAt: sql<number>`${now.getTime()}`.as('created_at'),
                updatedAt: sql<number>`${now.getTime()}`.as('updated_at'),
              })
              .from(participant)
              .where(and(eq(participant.id, userId), isNull(participant.teamId))),
          )
          .returning({ id: team.id }),
        db
          .update(participant)
          .set({ teamId: id, updatedAt: now })
          .where(
            and(
              eq(participant.id, userId),
              isNull(participant.teamId),
              exists(db.select({ id: team.id }).from(team).where(eq(team.id, id))),
            ),
          ),
      ]);
      if (!insert.length) {
        const current = await db.query.participant.findFirst({
          where: eq(participant.id, userId),
          columns: { id: true },
        });
        throw new Error(current ? TEAM_ERRORS.alreadyInTeam : TEAM_ERRORS.noProfile);
      }
      break;
    } catch (error) {
      // Drizzle/D1 may wrap the SQLite constraint error in a cause.
      const messages: string[] = [];
      let cause: unknown = error;
      while (cause instanceof Error) {
        messages.push(cause.message.toLowerCase());
        cause = cause.cause;
      }
      const message = messages.join(' ');
      if (
        message.includes('unique') &&
        (message.includes('name_canonical') || message.includes('team.name'))
      ) {
        throw new Error(TEAM_ERRORS.nameTaken, { cause: error });
      }
      if (message.includes('unique') && message.includes('invite_slug')) {
        if (attempt < 10) continue;
        throw new Error(TEAM_ERRORS.slugUnavailable, { cause: error });
      }
      throw error;
    }
  }

  const result = await getTeamByParticipant(userId);
  if (!result) throw new Error(TEAM_ERRORS.failed);
  return result;
}

/** Join a team by invite slug, enforcing the size cap. */
export async function joinTeamBySlug(userId: string, slug: string): Promise<TeamData> {
  const db = getAppDb();

  const p = await db.query.participant.findFirst({
    where: eq(participant.id, userId),
    columns: { id: true, teamId: true },
  });
  if (!p) throw new Error(TEAM_ERRORS.noProfile);
  if (p.teamId) throw new Error(TEAM_ERRORS.alreadyInTeam);

  const t = await db.query.team.findFirst({
    where: eq(team.inviteSlug, slug),
    with: { members: { columns: { id: true } } },
  });
  if (!t) throw new Error(TEAM_ERRORS.invalidInvite);
  if (t.members.length >= MAX_TEAM_SIZE) throw new Error(TEAM_ERRORS.full);

  // The count and membership condition are evaluated inside this single write.
  const joined = await db
    .update(participant)
    .set({ teamId: t.id, updatedAt: new Date() })
    .where(
      and(
        eq(participant.id, userId),
        isNull(participant.teamId),
        exists(db.select({ id: team.id }).from(team).where(eq(team.id, t.id))),
        lt(db.$count(participant, eq(participant.teamId, t.id)), MAX_TEAM_SIZE),
      ),
    )
    .returning({ id: participant.id });

  if (!joined.length) {
    const current = await db.query.participant.findFirst({
      where: eq(participant.id, userId),
      columns: { teamId: true },
    });
    if (!current) throw new Error(TEAM_ERRORS.noProfile);
    if (current.teamId) throw new Error(TEAM_ERRORS.alreadyInTeam);
    const currentTeam = await getTeamBySlug(slug);
    throw new Error(currentTeam ? TEAM_ERRORS.full : TEAM_ERRORS.invalidInvite);
  }

  const result = await getTeamByParticipant(userId);
  if (!result) throw new Error(TEAM_ERRORS.failed);
  return result;
}

/** Remove a member. Captain only. */
export async function kickMember(captainId: string, targetUserId: string): Promise<void> {
  const db = getAppDb();

  if (targetUserId === captainId) throw new Error(TEAM_ERRORS.cannotRemoveSelf);

  const captainParticipant = await db.query.participant.findFirst({
    where: eq(participant.id, captainId),
    columns: { teamId: true },
  });
  if (!captainParticipant?.teamId) throw new Error(TEAM_ERRORS.notInTeam);

  const t = await db.query.team.findFirst({
    where: eq(team.id, captainParticipant.teamId),
    columns: { id: true, captainId: true },
  });
  if (!t) throw new Error(TEAM_ERRORS.notFound);
  if (t.captainId !== captainId) throw new Error(TEAM_ERRORS.captainOnlyRemove);

  const target = await db.query.participant.findFirst({
    where: eq(participant.id, targetUserId),
    columns: { teamId: true },
  });
  if (!target || target.teamId !== t.id) throw new Error(TEAM_ERRORS.memberNotInTeam);

  await db
    .update(participant)
    .set({ teamId: null, updatedAt: new Date() })
    .where(and(eq(participant.id, targetUserId), eq(participant.teamId, t.id)));
}

/** Leave a team. Captains must dissolve instead. */
export async function leaveTeam(userId: string): Promise<void> {
  const db = getAppDb();

  const p = await db.query.participant.findFirst({
    where: eq(participant.id, userId),
    columns: { teamId: true },
  });
  if (!p?.teamId) throw new Error(TEAM_ERRORS.notInTeam);

  const t = await db.query.team.findFirst({
    where: eq(team.id, p.teamId),
    columns: { captainId: true },
  });
  if (!t) throw new Error(TEAM_ERRORS.notFound);
  if (t.captainId === userId) throw new Error(TEAM_ERRORS.captainCannotLeave);

  await db
    .update(participant)
    .set({ teamId: null, updatedAt: new Date() })
    .where(and(eq(participant.id, userId), eq(participant.teamId, p.teamId)));
}

/** Dissolve a team. Captain only: detach every member, then delete the row. */
export async function dissolveTeam(userId: string): Promise<void> {
  const db = getAppDb();

  const p = await db.query.participant.findFirst({
    where: eq(participant.id, userId),
    columns: { teamId: true },
  });
  if (!p?.teamId) throw new Error(TEAM_ERRORS.notInTeam);

  const t = await db.query.team.findFirst({
    where: eq(team.id, p.teamId),
    columns: { id: true, captainId: true },
  });
  if (!t) throw new Error(TEAM_ERRORS.notFound);
  if (t.captainId !== userId) throw new Error(TEAM_ERRORS.captainOnlyDissolve);

  // ON DELETE SET NULL detaches all members atomically with the deletion.
  await db.delete(team).where(and(eq(team.id, t.id), eq(team.captainId, userId)));
}
