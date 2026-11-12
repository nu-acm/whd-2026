import { expect, it } from 'vite-plus/test';
import {
  calculateRankings,
  juryScoresSchema,
  roundScoresSchema,
  MAX_JURY_COMMENT_LENGTH,
  type ScoringTeam,
} from '@/lib/scoring';
import { getJuryEmails, sessionIsJury } from '@/lib/jury.server';
import {
  distributeJurors,
  getPublishedResults,
  loadJury,
  loadScoringAdmin,
  publishResults,
  saveRoundScores,
  submitJuryScores,
  unpublishResults,
} from '@/lib/scoring.server';
import { finalizeTeams } from '@/lib/contest.server';
import { createTeam, joinTeamBySlug } from '@/lib/team.server';
import { authRequest, bindings, seedParticipant, signIn } from './support';

const perfect = [20, 25, 20, 25, 10];
const sessionRequest = async (email: string) =>
  authRequest('get-session', undefined, (await signIn(email)).cookie);

async function distribute(admin: Request) {
  const { revision } = await loadScoringAdmin(admin);
  await distributeJurors(admin, { revision });
}

async function setup() {
  for (const id of ['a', 'b', 'c']) await seedParticipant(id);
  const team = await createTeam('a', 'Score Team');
  await joinTeamBySlug('b', team.inviteSlug);
  await joinTeamBySlug('c', team.inviteSlug);
  bindings.REGISTRATION_DEADLINE = '2000-01-01T00:00:00Z';
  await finalizeTeams();
  const admin = await sessionRequest('admin@example.test');
  bindings.JURY_EMAILS = 'judge@example.test';
  await distribute(admin);
  const judge = await sessionRequest('judge@example.test');
  return { admin, judge, team };
}

it('authorizes jurors only from the comma- or whitespace-separated JURY_EMAILS allowlist', async () => {
  expect(getJuryEmails()).toEqual([]);
  expect(sessionIsJury(null)).toBe(false);
  expect(sessionIsJury({ user: {} })).toBe(false);
  expect(sessionIsJury({ user: { email: 'judge@example.test' } })).toBe(false);
  bindings.JURY_EMAILS =
    ' JUDGE@example.test, judge@example.test\nother@example.test ADMIN@example.test ';
  expect(getJuryEmails()).toEqual(['judge@example.test', 'other@example.test']);
  expect(sessionIsJury({ user: { email: ' JUDGE@example.test ' } })).toBe(true);
  expect(sessionIsJury({ user: { email: 'outsider@example.test' } })).toBe(false);
  expect(sessionIsJury({ user: { email: 'admin@example.test' } })).toBe(false);
  bindings.JURY_EMAILS = '  , \n ';
  expect(getJuryEmails()).toEqual([]);
  expect(sessionIsJury({ user: { email: 'judge@example.test' } })).toBe(false);
});

it('assigns configured jurors by email before sign-in', async () => {
  const { admin, judge, team } = await setup();
  bindings.JURY_EMAILS = 'new-judge@example.test';
  await distribute(admin);
  expect((await loadScoringAdmin(admin)).teams[0].assessment).toEqual({
    jurorEmail: 'new-judge@example.test',
    comment: '',
    scores: null,
  });
  expect(
    await bindings.DB.prepare('SELECT id FROM user WHERE email = ?')
      .bind('new-judge@example.test')
      .first(),
  ).toBeNull();
  expect(sessionIsJury({ user: { email: 'judge@example.test' } })).toBe(false);
  const newJudge = await sessionRequest('new-judge@example.test');
  expect((await loadJury(newJudge)).teams.map((row) => row.id)).toEqual([team.id]);
  bindings.JURY_EMAILS += ',judge@example.test';
  expect((await loadJury(judge)).teams).toEqual([]);
  await expect(submitJuryScores(judge, { teamId: team.id, scores: perfect })).rejects.toThrow(
    'scoring.errors.unavailable',
  );
});

it('revokes existing jury sessions immediately without deleting assignments or submitted scores', async () => {
  const { admin, judge, team } = await setup();
  await submitJuryScores(judge, { teamId: team.id, scores: perfect });
  bindings.JURY_EMAILS = '';
  await expect(loadJury(judge)).rejects.toThrow('Forbidden');
  await expect(
    submitJuryScores(judge, { teamId: team.id, scores: [0, 0, 0, 0, 0] }),
  ).rejects.toThrow('Forbidden');
  const data = await loadScoringAdmin(admin);
  expect(data.juryEmails).toEqual([]);
  expect(data.teams[0].assessment).toEqual({
    jurorEmail: 'judge@example.test',
    comment: '',
    scores: perfect,
  });
  bindings.JURY_EMAILS = 'judge@example.test';
  expect((await loadJury(judge)).teams[0].scores).toEqual(perfect);
});

it('combines normalized rounds with a single juror assessment and keeps zero distinct from missing', () => {
  const team: ScoringTeam = {
    id: 'one',
    number: 1,
    name: 'One',
    icpc: 480,
    math: 54,
    assessment: { jurorEmail: 'judge@example.test', comment: '', scores: perfect },
  };
  expect(calculateRankings([team])[0]).toMatchObject({
    product: 100,
    total: 91,
    rank: 1,
    submitted: 1,
    assigned: 1,
  });
  expect(
    calculateRankings([
      {
        ...team,
        icpc: 0,
        math: 0,
        assessment: { jurorEmail: 'judge@example.test', comment: '', scores: [0, 0, 0, 0, 0] },
      },
    ])[0],
  ).toMatchObject({ product: 0, total: 0, rank: 1 });
  for (const incomplete of [
    { ...team, icpc: null },
    { ...team, math: null },
    { ...team, assessment: null },
    { ...team, assessment: { jurorEmail: 'judge@example.test', comment: '', scores: null } },
  ])
    expect(calculateRankings([incomplete])[0]).toMatchObject({ total: null, rank: null });
});

it('normalizes each raw round maximum to its ranking weight', () => {
  const team: ScoringTeam = {
    id: 'one',
    number: 1,
    name: 'One',
    icpc: 600,
    math: 60,
    assessment: { jurorEmail: 'judge@example.test', comment: '', scores: perfect },
  };
  const zeroAssessment = { jurorEmail: 'judge@example.test', comment: '', scores: [0, 0, 0, 0, 0] };
  expect(calculateRankings([team])[0].total).toBe(100);
  expect(calculateRankings([{ ...team, math: 0, assessment: zeroAssessment }])[0].total).toBe(30);
  expect(calculateRankings([{ ...team, icpc: 0, assessment: zeroAssessment }])[0].total).toBe(30);
  expect(calculateRankings([{ ...team, icpc: 0, math: 0 }])[0].total).toBe(40);
});

it('persists raw round maxima and rejects scores above them without changing saved scores', async () => {
  const { admin, team } = await setup();
  await saveRoundScores(admin, { teamId: team.id, icpc: 600, math: 60 });
  for (const scores of [
    { icpc: 601, math: 60 },
    { icpc: 600, math: 61 },
  ]) {
    await expect(saveRoundScores(admin, { teamId: team.id, ...scores })).rejects.toThrow();
    expect((await loadScoringAdmin(admin)).teams[0]).toMatchObject({ icpc: 600, math: 60 });
  }
});

it('shares equal places, skips the next place, and treats equivalent normalized scores as ties', () => {
  const team = (id: string, number: number, score: number): ScoringTeam => ({
    id,
    number,
    name: id,
    icpc: score,
    math: 60,
    assessment: { jurorEmail: 'judge@example.test', comment: '', scores: perfect },
  });
  const rows = calculateRankings([
    team('third', 3, 599),
    team('second', 2, 600),
    team('first', 1, 600),
  ]);
  expect(rows.map((r) => [r.id, r.rank])).toEqual([
    ['first', 1],
    ['second', 1],
    ['third', 3],
  ]);
  expect(rows[2].total).toBeCloseTo(99.95, 8);
  const zeroAssessment = { jurorEmail: 'judge@example.test', comment: '', scores: [0, 0, 0, 0, 0] };
  const equivalent = calculateRankings([
    { ...team('icpc', 1, 10), math: 0, assessment: zeroAssessment },
    { ...team('math', 2, 0), math: 1, assessment: zeroAssessment },
  ]);
  expect(equivalent.map((row) => [row.total, row.rank])).toEqual([
    [0.5, 1],
    [0.5, 1],
  ]);
});

it('accepts only whole scores within each round and criterion limit', () => {
  for (const score of [-1, NaN, Infinity, 0.72, 99.99, 1.001])
    for (const round of ['icpc', 'math'])
      expect(
        roundScoresSchema.safeParse({ teamId: 'a', icpc: 0, math: 0, [round]: score }).success,
      ).toBe(false);
  expect(roundScoresSchema.safeParse({ teamId: 'a', icpc: 600, math: 60 }).success).toBe(true);
  expect(roundScoresSchema.safeParse({ teamId: 'a', icpc: 101, math: null }).success).toBe(true);
  expect(roundScoresSchema.safeParse({ teamId: 'a', icpc: 601, math: 60 }).success).toBe(false);
  expect(roundScoresSchema.safeParse({ teamId: 'a', icpc: 600, math: 61 }).success).toBe(false);
  for (const scores of [
    [20, 25],
    [21, 25, 20, 25, 10],
    [20, 26, 20, 25, 10],
    [20, 25, -1, 25, 10],
    [20, 25, 20, 25, 11],
    [20, 25, 20, 25, NaN],
    [1.001, 0, 0, 0, 0],
    [0.72, 0, 0, 0, 0],
  ])
    expect(juryScoresSchema.safeParse({ teamId: 'a', scores }).success).toBe(false);
});

it('separates admin round scoring from assigned jury Product Design scoring', async () => {
  const { admin, judge, team } = await setup();
  const outsider = await sessionRequest('outsider@example.test');
  expect(sessionIsJury(null)).toBe(false);
  expect(sessionIsJury({ user: { email: 'JUDGE@example.test' } })).toBe(true);
  await saveRoundScores(admin, { teamId: team.id, icpc: 480, math: 54 });
  const view = await loadJury(judge);
  expect(view).toMatchObject({
    juror: { email: 'judge@example.test' },
    teams: [{ id: team.id, scores: null }],
  });
  expect(JSON.stringify(view)).not.toMatch(/iin|contestPassword|icpc|math|captainId/);
  await expect(loadJury(outsider)).rejects.toThrow('Forbidden');
  await expect(loadJury(admin)).rejects.toThrow('Forbidden');
  await expect(loadScoringAdmin(judge)).rejects.toThrow('Forbidden');
  // A juror cannot edit objective round scores even for their assigned team.
  await expect(saveRoundScores(judge, { teamId: team.id, icpc: 600, math: 60 })).rejects.toThrow(
    'Forbidden',
  );
  await expect(saveRoundScores(outsider, { teamId: team.id, icpc: 600, math: 60 })).rejects.toThrow(
    'Forbidden',
  );
  await expect(submitJuryScores(admin, { teamId: team.id, scores: perfect })).rejects.toThrow(
    'Forbidden',
  );
  await expect(publishResults(judge)).rejects.toThrow('Forbidden');
  await expect(unpublishResults(outsider)).rejects.toThrow('Forbidden');
  await expect(submitJuryScores(outsider, { teamId: team.id, scores: perfect })).rejects.toThrow(
    'Forbidden',
  );
  await expect(
    submitJuryScores(judge, { teamId: 'not-assigned', scores: perfect }),
  ).rejects.toThrow('scoring.errors.unavailable');
  await expect(distributeJurors(judge, { revision: 0 })).rejects.toThrow('Forbidden');
  await submitJuryScores(judge, { teamId: team.id, scores: perfect });
  await saveRoundScores(admin, { teamId: team.id, icpc: 510, math: 57 });
  expect((await loadJury(judge)).teams[0].scores).toEqual(perfect);
  await bindings.DB.prepare('DELETE FROM jury_assessment WHERE team_id = ?').bind(team.id).run();
  await expect(submitJuryScores(judge, { teamId: team.id, scores: perfect })).rejects.toThrow(
    'scoring.errors.unavailable',
  );
  bindings.JURY_EMAILS = '';
  await expect(loadJury(judge)).rejects.toThrow('Forbidden');
  bindings.JURY_EMAILS = ' JUDGE@example.test ';
  expect((await loadScoringAdmin(admin)).juryEmails).toEqual(['judge@example.test']);
  expect((await loadJury(judge)).juror.email).toBe('judge@example.test');
});

it('requires one assigned juror, updates own submissions, publishes a frozen public snapshot, and supports corrections', async () => {
  const { admin, judge, team } = await setup();
  expect(await getPublishedResults()).toBeNull();
  await expect(publishResults(admin)).rejects.toThrow('scoring.errors.incomplete');
  await saveRoundScores(admin, { teamId: team.id, icpc: 480, math: 54 });
  await submitJuryScores(judge, { teamId: team.id, scores: perfect });
  await submitJuryScores(judge, { teamId: team.id, scores: [18, 25, 20, 25, 10] });
  await publishResults(admin);
  const published = await getPublishedResults();
  expect(published?.rows[0]).toMatchObject({
    icpc: 480,
    math: 54,
    product: 98,
    total: 90.2,
    rank: 1,
  });
  expect(JSON.stringify(published)).not.toMatch(/email|jurorEmail|scores|password|iin/i);
  expect((await loadJury(judge)).published).toBe(true);
  for (const action of [
    () => saveRoundScores(admin, { teamId: team.id, icpc: 0, math: 0 }),
    () => submitJuryScores(judge, { teamId: team.id, scores: perfect }),
    () => distribute(admin),
  ])
    await expect(action()).rejects.toThrow('scoring.errors.published');
  expect(await getPublishedResults()).toEqual(published);
  await unpublishResults(admin);
  expect(await getPublishedResults()).toBeNull();
  await saveRoundScores(admin, { teamId: team.id, icpc: 600, math: 60 });
  await publishResults(admin);
  expect((await getPublishedResults())?.rows[0].total).toBe(99.2);
});

it('saves optional jury comments privately, validates their length, and locks them on publication', async () => {
  const { admin, judge, team } = await setup();
  const comment = 'Strong prototype.\nNeeds more user interviews.';
  await submitJuryScores(judge, { teamId: team.id, scores: perfect, comment: `  ${comment}  ` });
  expect((await loadJury(judge)).teams[0].comment).toBe(comment);
  expect((await loadScoringAdmin(admin)).teams[0].assessment?.comment).toBe(comment);
  await expect(
    submitJuryScores(judge, {
      teamId: team.id,
      scores: perfect,
      comment: 'x'.repeat(MAX_JURY_COMMENT_LENGTH + 1),
    }),
  ).rejects.toThrow();
  expect((await loadJury(judge)).teams[0].comment).toBe(comment);
  bindings.JURY_EMAILS += ',other@example.test';
  const other = await sessionRequest('other@example.test');
  expect((await loadJury(other)).teams).toEqual([]);
  await expect(
    submitJuryScores(other, { teamId: team.id, scores: perfect, comment: 'Not assigned' }),
  ).rejects.toThrow('scoring.errors.unavailable');
  await submitJuryScores(judge, { teamId: team.id, scores: perfect, comment: '   ' });
  expect((await loadJury(judge)).teams[0].comment).toBe('');
  await submitJuryScores(judge, { teamId: team.id, scores: perfect, comment });
  await saveRoundScores(admin, { teamId: team.id, icpc: 600, math: 60 });
  expect((await loadScoringAdmin(admin)).teams[0].assessment?.comment).toBe(comment);
  await publishResults(admin);
  expect(JSON.stringify(await getPublishedResults())).not.toContain(comment);
  expect(JSON.stringify(await getPublishedResults())).not.toContain('comment');
  await expect(
    submitJuryScores(judge, { teamId: team.id, scores: perfect, comment: 'Late change' }),
  ).rejects.toThrow('scoring.errors.published');
  expect((await loadJury(judge)).teams[0].comment).toBe(comment);
});

it('keeps concurrent score writes and publication consistent', async () => {
  const { admin, judge, team } = await setup();
  await saveRoundScores(admin, { teamId: team.id, icpc: 600, math: 60 });
  await submitJuryScores(judge, { teamId: team.id, scores: perfect });
  await Promise.allSettled([
    publishResults(admin),
    saveRoundScores(admin, { teamId: team.id, icpc: 0, math: 0 }),
    submitJuryScores(judge, { teamId: team.id, scores: [0, 0, 0, 0, 0] }),
  ]);
  const overview = await loadScoringAdmin(admin);
  const published = await getPublishedResults();
  if (published) expect(published.rows).toEqual(overview.rankings);
  else {
    await publishResults(admin);
    expect((await getPublishedResults())?.rows).toEqual(overview.rankings);
  }
});

it('randomly assigns each finalized team once and balances configured jurors, including when there are fewer teams', async () => {
  const { admin, team } = await setup();
  for (let i = 2; i <= 12; i++)
    await bindings.DB.prepare(`INSERT INTO team (id, name, name_canonical, invite_slug, captain_id, number)
      VALUES (?, ?, ?, ?, 'a', ?)`)
      .bind(`team${i}`, `Team ${i}`, `team ${i}`, `team${i}`, i)
      .run();
  await bindings.DB.prepare(`INSERT INTO team (id, name, name_canonical, invite_slug, captain_id)
    VALUES ('unfinalized', 'Unfinalized', 'unfinalized', 'unfinalized', 'a')`).run();
  bindings.JURY_EMAILS +=
    ',judge2@example.test judge3@example.test\njudge4@example.test,judge5@example.test';
  const allocations = new Set<string>();
  for (let attempt = 0; attempt < 6; attempt++) {
    await distribute(admin);
    const view = await loadScoringAdmin(admin);
    expect(view.teams).toHaveLength(12);
    const counts = new Map(view.juryEmails.map((email) => [email, 0]));
    for (const team of view.teams) {
      expect(team.assessment).not.toBeNull();
      const assigned = team.assessment!.jurorEmail;
      expect(counts.has(assigned)).toBe(true);
      counts.set(assigned, counts.get(assigned)! + 1);
    }
    expect(Math.max(...counts.values()) - Math.min(...counts.values())).toBe(1);
    expect(
      (await bindings.DB.prepare('SELECT count(*) AS n FROM jury_assessment').first())?.n,
    ).toBe(12);
    allocations.add(JSON.stringify(view.teams.map((t) => t.assessment!.jurorEmail)));
  }
  expect(allocations.size).toBeGreaterThan(1);
  await bindings.DB.prepare('UPDATE team SET number = NULL WHERE id != ?').bind(team.id).run();
  await distribute(admin);
  const few = await loadScoringAdmin(admin);
  expect(few.teams).toHaveLength(1);
  expect(few.teams[0].assessment).not.toBeNull();
});

it('enforces exactly one jury assignment per team in D1', async () => {
  const { admin, team } = await setup();
  await expect(
    bindings.DB.prepare('INSERT INTO jury_assessment (team_id, juror_email) VALUES (?, ?)')
      .bind(team.id, 'other@example.test')
      .run(),
  ).rejects.toThrow();
  expect((await loadScoringAdmin(admin)).teams[0].assessment).toEqual({
    jurorEmail: 'judge@example.test',
    comment: '',
    scores: null,
  });
});

it('keeps jury distribution independent of round scores and locks it after Product Design grading', async () => {
  const { admin, judge, team } = await setup();
  await saveRoundScores(admin, { teamId: team.id, icpc: 0, math: 54 });
  await distribute(admin);
  const before = await loadScoringAdmin(admin);
  expect(before.teams[0]).toMatchObject({ icpc: 0, math: 54 });
  await submitJuryScores(judge, { teamId: team.id, scores: [0, 0, 0, 0, 0] });
  const scored = await loadScoringAdmin(admin);
  await expect(distribute(admin)).rejects.toThrow('scoring.errors.scoringStarted');
  expect(await loadScoringAdmin(admin)).toEqual(scored);
  await saveRoundScores(admin, { teamId: team.id, icpc: 600, math: 60 });
  expect((await loadJury(judge)).teams[0].scores).toEqual([0, 0, 0, 0, 0]);
  await submitJuryScores(judge, { teamId: team.id, scores: perfect });
  await expect(distributeJurors(admin, { revision: scored.revision })).rejects.toThrow(
    'scoring.errors.changed',
  );
});

it('keeps admin and jury exclusive when an email appears in both allowlists', async () => {
  const { admin, judge, team } = await setup();
  bindings.JURY_EMAILS += ', ADMIN@example.test ';
  expect(getJuryEmails()).toEqual(['judge@example.test']);
  expect(sessionIsJury({ user: { email: 'admin@example.test' } })).toBe(false);
  await expect(loadJury(admin)).rejects.toThrow('Forbidden');
  await saveRoundScores(admin, { teamId: team.id, icpc: 600, math: 60 });
  await expect(submitJuryScores(admin, { teamId: team.id, scores: perfect })).rejects.toThrow(
    'Forbidden',
  );
  await distribute(admin);
  expect((await loadJury(judge)).teams.map((t) => t.id)).toEqual([team.id]);
  expect((await loadScoringAdmin(admin)).juryEmails).toEqual(['judge@example.test']);
});

it('allows admins to enter round scores without a jury assignment and rejects unfinished teams', async () => {
  const { admin, judge, team } = await setup();
  await bindings.DB.prepare('DELETE FROM jury_assessment WHERE team_id = ?').bind(team.id).run();
  await saveRoundScores(admin, { teamId: team.id, icpc: 420, math: 48 });
  expect((await loadScoringAdmin(admin)).teams[0]).toMatchObject({
    icpc: 420,
    math: 48,
    assessment: null,
  });
  await expect(saveRoundScores(judge, { teamId: team.id, icpc: 600, math: 60 })).rejects.toThrow(
    'Forbidden',
  );
  await bindings.DB.prepare('UPDATE team SET number = NULL WHERE id = ?').bind(team.id).run();
  await expect(saveRoundScores(admin, { teamId: team.id, icpc: 600, math: 60 })).rejects.toThrow(
    'scoring.errors.unavailable',
  );
});

it('rejects distribution without configured jurors or finalized teams', async () => {
  const admin = await sessionRequest('admin@example.test');
  await expect(distribute(admin)).rejects.toThrow('scoring.errors.noJurors');
  bindings.JURY_EMAILS = 'judge@example.test';
  await expect(distribute(admin)).rejects.toThrow('scoring.errors.unavailable');
  expect((await bindings.DB.prepare('SELECT count(*) AS n FROM jury_assessment').first())?.n).toBe(
    0,
  );
});

it('keeps racing distributions and publication consistent', async () => {
  const { admin, judge, team } = await setup();
  await saveRoundScores(admin, { teamId: team.id, icpc: 600, math: 60 });
  await submitJuryScores(judge, { teamId: team.id, scores: perfect });
  const { revision } = await loadScoringAdmin(admin);
  await Promise.allSettled([
    distributeJurors(admin, { revision }),
    distributeJurors(admin, { revision }),
    publishResults(admin),
  ]);
  const view = await loadScoringAdmin(admin);
  expect(view.teams[0].assessment).not.toBeNull();
  const published = await getPublishedResults();
  if (published) expect(published.rows).toEqual(view.rankings);
});

it('keeps admin round writes independent when jury distribution runs concurrently', async () => {
  const { admin, team } = await setup();
  bindings.JURY_EMAILS += ',other@example.test';
  const { revision } = await loadScoringAdmin(admin);
  const [write] = await Promise.allSettled([
    saveRoundScores(admin, { teamId: team.id, icpc: 50, math: 60 }),
    distributeJurors(admin, { revision }),
  ]);
  expect(write.status).toBe('fulfilled');
  const view = await loadScoringAdmin(admin);
  expect(view.teams[0]).toMatchObject({ icpc: 50, math: 60 });
  expect(view.teams[0].assessment).not.toBeNull();
});
