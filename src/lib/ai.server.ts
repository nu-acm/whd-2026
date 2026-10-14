import { env } from 'cloudflare:workers';
import { sampleExamples } from '@/lib/team-name-examples';
import { claimTeamNameGeneration } from '@/lib/ai-limit.server';
import { getParticipant } from '@/lib/onboarding.server';
import { isRegistrationOpen, REGISTRATION_CLOSED_I18N_KEY } from '@/lib/registration.server';
import { TEAM_ERRORS } from '@/lib/team-errors';

interface AiEnv {
  AI: {
    run: (
      model: string,
      options: { messages: unknown[]; temperature?: number; top_p?: number; max_tokens?: number },
    ) => Promise<unknown>;
  };
}

/** Same bounds as createTeamSchema, so a generated name can be submitted as-is. */
const MIN_LENGTH = 3;
const MAX_LENGTH = 30;

const THEMES = [
  'tech puns',
  'space',
  'nature',
  'music',
  'mathematics',
  'algorithms',
  'design',
  'wordplay',
  'mythology',
  'sci-fi',
  'famous women in science',
  'minimal',
  'bold',
];

/** Models like to wrap the answer in quotes or add a trailing full stop. */
function cleanName(raw: string): string {
  const firstLine = raw.trim().split('\n')[0] ?? '';
  return firstLine
    .replace(/^["'«“]+|["'»”.!]+$/g, '')
    .trim()
    .slice(0, MAX_LENGTH)
    .trim();
}

/** The same requirements as creating a team, plus a persistent request limit. */
export async function generateTeamNameForParticipant(userId: string): Promise<string> {
  if (!isRegistrationOpen()) throw new Error(REGISTRATION_CLOSED_I18N_KEY);
  const profile = await getParticipant(userId);
  if (!profile) throw new Error(TEAM_ERRORS.noProfile);
  if (profile.teamId) throw new Error(TEAM_ERRORS.alreadyInTeam);
  await claimTeamNameGeneration(userId);
  try {
    return await generateTeamName();
  } catch (error) {
    console.error('[team name] generation failed:', error);
    throw new Error('dashboard.generateFailed', { cause: error });
  }
}

async function generateTeamName(): Promise<string> {
  const examples = sampleExamples(20).join(', ');
  const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
  const prompt = [
    'Here are real team names from past hackathons at Nazarbayev University:',
    examples,
    '',
    "Generate one new team name for Women's Hack Day, a team competition for girls in",
    'mathematics, competitive programming and product design.',
    `Rules: 2–3 words max, under ${MAX_LENGTH} characters. Easy to pronounce and memorable.`,
    'Be creative and varied. Take inspiration from the examples but prefer a fresh angle.',
    'Avoid obscure inside jokes and well-known brand names.',
    `Optional vibe: something ${theme}-flavored.`,
    '',
    'Return only the name, no punctuation, no quotes, no explanation.',
  ].join('\n');

  const { AI } = env as unknown as AiEnv;
  const response = await AI.run('@cf/ibm-granite/granite-4.0-h-micro', {
    messages: [{ role: 'user', content: prompt }],
    temperature: 1.2,
    top_p: 0.95,
    max_tokens: 32,
  });

  const content = (response as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]
    ?.message?.content;
  const name = cleanName(content ?? '');
  if (name.length < MIN_LENGTH) throw new Error('AI returned no usable team name');
  return name;
}
