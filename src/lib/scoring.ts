import { z } from 'zod';

export const distributionSchema = z.object({ revision: z.number().int().nonnegative() });

export const ROUND_MAX = { icpc: 600, math: 60, product: 100 } as const;
export const MAX_JURY_COMMENT_LENGTH = 2000;

export const PRODUCT_CRITERIA = [
  { id: 'understanding', max: 20 },
  { id: 'value', max: 25 },
  { id: 'prototype', max: 20 },
  { id: 'validation', max: 25 },
  { id: 'presentation', max: 10 },
] as const;

const points = (max: number) =>
  z.number().min(0).max(max).refine(Number.isInteger, {
    error: 'scoring.errors.precision',
  });

export const roundScoresSchema = z.object({
  teamId: z.string().min(1),
  icpc: points(ROUND_MAX.icpc).nullable(),
  math: points(ROUND_MAX.math).nullable(),
});

export const juryScoresSchema = z.object({
  teamId: z.string().min(1),
  comment: z.string().trim().max(MAX_JURY_COMMENT_LENGTH).default(''),
  scores: z
    .array(points(ROUND_MAX.product))
    .length(PRODUCT_CRITERIA.length)
    .refine((scores) => scores.every((score, i) => score <= PRODUCT_CRITERIA[i].max), {
      error: 'scoring.errors.criteria',
    }),
});

export type ScoringTeam = {
  id: string;
  number: number;
  name: string;
  icpc: number | null;
  math: number | null;
  assessment: { jurorEmail: string; scores: number[] | null; comment: string } | null;
};

export type RankedTeam = {
  id: string;
  number: number;
  name: string;
  icpc: number | null;
  math: number | null;
  product: number | null;
  total: number | null;
  rank: number | null;
  submitted: number;
  assigned: number;
};

/** Scale whole-number scores before dividing so equivalent totals share a rank exactly. */
export function calculateRankings(teams: ScoringTeam[]): RankedTeam[] {
  const rows = teams.map((team): RankedTeam => {
    const product = team.assessment?.scores?.reduce((sum, score) => sum + score, 0) ?? null;
    const total =
      team.icpc !== null && team.math !== null && product !== null
        ? (team.icpc * 30 +
            team.math * (ROUND_MAX.icpc / ROUND_MAX.math) * 30 +
            product * (ROUND_MAX.icpc / ROUND_MAX.product) * 40) /
          ROUND_MAX.icpc
        : null;
    return {
      id: team.id,
      number: team.number,
      name: team.name,
      icpc: team.icpc,
      math: team.math,
      product,
      total,
      rank: null,
      assigned: Number(team.assessment !== null),
      submitted: Number(product !== null),
    };
  });
  rows.sort((a, b) => (b.total ?? -1) - (a.total ?? -1) || a.number - b.number);
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].total === null) continue;
    rows[i].rank = i > 0 && rows[i].total === rows[i - 1].total ? rows[i - 1].rank : i + 1;
  }
  return rows;
}

export type PublishedResults = { publishedAt: string; rows: RankedTeam[] };
