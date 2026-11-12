import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { ensureJury, ensureScoringAdmin, getJuryEmails } from '@/lib/jury.server';
import {
  distributionSchema,
  calculateRankings,
  juryScoresSchema,
  roundScoresSchema,
  type PublishedResults,
  type ScoringTeam,
} from '@/lib/scoring';

const db = () => (env as unknown as { DB: D1Database }).DB;
const editable =
  "EXISTS (SELECT 1 FROM scoring_state WHERE id = 'event' AND published_result IS NULL)";
const fail = (key: string): never => {
  throw new Error(`scoring.errors.${key}`);
};

type StoredTeam = {
  id: string;
  name: string;
  number: number;
  icpc: number | null;
  math: number | null;
  jurorEmail: string | null;
  scores: string | null;
  comment: string | null;
};

/** A D1 batch reads one consistent view, including the revision used to publish that view. */
async function overview() {
  const connection = db();
  const [state, teams] = await connection.batch([
    connection.prepare("SELECT revision, published_result FROM scoring_state WHERE id = 'event'"),
    connection.prepare(`SELECT t.id, t.name, t.number, r.icpc, r.math,
      a.juror_email AS jurorEmail, a.scores, a.comment FROM team t
      LEFT JOIN round_score r ON r.team_id = t.id
      LEFT JOIN jury_assessment a ON a.team_id = t.id
      WHERE t.number IS NOT NULL ORDER BY t.number`),
  ]);
  const current = state.results[0] as
    | { revision: number; published_result: string | null }
    | undefined;
  if (!current) throw new Error('Scoring migration has not been applied');
  const scoringTeams: ScoringTeam[] = (teams.results as StoredTeam[]).map(
    ({ jurorEmail, scores, comment, ...team }) => ({
      ...team,
      assessment:
        jurorEmail === null
          ? null
          : {
              jurorEmail,
              scores: scores === null ? null : (JSON.parse(scores) as number[]),
              comment: comment!,
            },
    }),
  );
  return {
    revision: current.revision,
    published: current.published_result !== null,
    teams: scoringTeams,
    juryEmails: getJuryEmails(),
    rankings: calculateRankings(scoringTeams),
  };
}

/** Every statement guards publication in SQL, so a write racing Publish cannot change its snapshot. */
async function edit(statements: D1PreparedStatement[]) {
  const results = await db().batch([
    ...statements,
    db().prepare(
      `UPDATE scoring_state SET revision = revision + 1 WHERE id = 'event' AND ${editable}`,
    ),
  ]);
  if (!results.at(-1)?.meta.changes) fail('published');
  if (!results[0].meta.changes) fail('unavailable');
}

export async function loadScoringAdmin(request: Request) {
  await ensureScoringAdmin(request);
  return overview();
}

export async function saveRoundScores(request: Request, input: z.infer<typeof roundScoresSchema>) {
  const session = await ensureScoringAdmin(request);
  const data = roundScoresSchema.parse(input);
  await edit([
    db()
      .prepare(`INSERT INTO round_score (team_id, icpc, math, updated_by, updated_at)
    SELECT id, ?, ?, ?, ? FROM team WHERE id = ? AND number IS NOT NULL AND ${editable}
    ON CONFLICT(team_id) DO UPDATE SET icpc = excluded.icpc, math = excluded.math,
      updated_by = excluded.updated_by, updated_at = excluded.updated_at WHERE ${editable}`)
      .bind(data.icpc, data.math, session.user.id, Date.now(), data.teamId),
  ]);
}

/** Shuffle both lists so every configured juror has the same chance of receiving an extra team. */
function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Rejection sampling avoids modulo bias.
    const limit = 2 ** 32 - (2 ** 32 % (i + 1));
    const random = new Uint32Array(1);
    do crypto.getRandomValues(random);
    while (random[0] >= limit);
    const j = random[0] % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function distributeJurors(
  request: Request,
  input: z.infer<typeof distributionSchema>,
) {
  await ensureScoringAdmin(request);
  const { revision } = distributionSchema.parse(input);
  const data = await overview();
  if (data.published) fail('published');
  if (revision !== data.revision) fail('changed');
  if (data.teams.some((team) => team.assessment !== null && team.assessment.scores !== null))
    fail('scoringStarted');
  const jurors = shuffle(data.juryEmails);
  if (!jurors.length) fail('noJurors');
  if (!data.teams.length) fail('unavailable');
  const assignments = JSON.stringify(
    shuffle(data.teams).map((team, i) => ({
      teamId: team.id,
      jurorEmail: jurors[i % jurors.length],
    })),
  );
  // Team finalization does not increment scoring revision, so also guard the eligible team set.
  const guard = `${editable}
    AND EXISTS (SELECT 1 FROM scoring_state WHERE id = 'event' AND revision = ?)
    AND (SELECT count(*) FROM team WHERE number IS NOT NULL) = json_array_length(?)
    AND NOT EXISTS (SELECT 1 FROM json_each(?) a WHERE NOT EXISTS (
      SELECT 1 FROM team t WHERE t.id = json_extract(a.value, '$.teamId') AND t.number IS NOT NULL))`;
  const results = await db().batch([
    db()
      .prepare(
        `DELETE FROM jury_assessment WHERE team_id IN (SELECT id FROM team WHERE number IS NOT NULL) AND ${guard}`,
      )
      .bind(revision, assignments, assignments),
    db()
      .prepare(`INSERT INTO jury_assessment (team_id, juror_email)
      SELECT json_extract(a.value, '$.teamId'), json_extract(a.value, '$.jurorEmail')
      FROM json_each(?) a WHERE ${guard}`)
      .bind(assignments, revision, assignments, assignments),
    db()
      .prepare(`UPDATE scoring_state SET revision = revision + 1 WHERE id = 'event' AND ${guard}`)
      .bind(revision, assignments, assignments),
  ]);
  if (!results.at(-1)?.meta.changes) fail('changed');
}

export async function loadJury(request: Request) {
  const email = await ensureJury(request);
  const [state, assignments] = await db().batch([
    db().prepare(
      "SELECT published_result IS NOT NULL AS published FROM scoring_state WHERE id = 'event'",
    ),
    db()
      .prepare(`SELECT t.id, t.name, t.number, a.scores, a.comment FROM jury_assessment a
      JOIN team t ON t.id = a.team_id WHERE a.juror_email = ? AND t.number IS NOT NULL ORDER BY t.number`)
      .bind(email),
  ]);
  // Returns only assigned teams and their scores, without participant data or other jurors’ assessments.
  return {
    juror: { email },
    published: !!(state.results[0] as { published: number } | undefined)?.published,
    teams: (
      assignments.results as {
        id: string;
        name: string;
        number: number;
        scores: string | null;
        comment: string;
      }[]
    ).map((t) => ({ ...t, scores: t.scores === null ? null : (JSON.parse(t.scores) as number[]) })),
  };
}

export async function submitJuryScores(request: Request, input: z.input<typeof juryScoresSchema>) {
  const email = await ensureJury(request);
  const { teamId, scores, comment } = juryScoresSchema.parse(input);
  await edit([
    db()
      .prepare(`UPDATE jury_assessment SET scores = ?, comment = ?, submitted_at = ?
    WHERE team_id = ? AND juror_email = ? AND ${editable}
    AND EXISTS (SELECT 1 FROM team WHERE id = ? AND number IS NOT NULL)`)
      .bind(JSON.stringify(scores), comment, Date.now(), teamId, email, teamId),
  ]);
}

export async function publishResults(request: Request) {
  await ensureScoringAdmin(request);
  const data = await overview();
  if (data.published) fail('published');
  if (!data.rankings.length || data.rankings.some((r) => r.total === null)) fail('incomplete');
  const snapshot: PublishedResults = { publishedAt: new Date().toISOString(), rows: data.rankings };
  const result = await db()
    .prepare(`UPDATE scoring_state SET published_result = ?, revision = revision + 1
    WHERE id = 'event' AND revision = ? AND published_result IS NULL
    AND (SELECT count(*) FROM team WHERE number IS NOT NULL) = ?`)
    .bind(JSON.stringify(snapshot), data.revision, data.teams.length)
    .run();
  if (!result.meta.changes) fail('changed');
}

export async function unpublishResults(request: Request) {
  await ensureScoringAdmin(request);
  await db()
    .prepare(
      "UPDATE scoring_state SET published_result = NULL, revision = revision + 1 WHERE id = 'event'",
    )
    .run();
}

export async function getPublishedResults(): Promise<PublishedResults | null> {
  const result = await db()
    .prepare("SELECT published_result FROM scoring_state WHERE id = 'event'")
    .first<{ published_result: string | null }>();
  return result?.published_result
    ? (JSON.parse(result.published_result) as PublishedResults)
    : null;
}
