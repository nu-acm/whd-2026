/** Shared question order keeps the landing preview and full FAQ in sync. */
export const FEATURED_FAQ_QUESTIONS = [
  'whoCanParticipate',
  'professional',
  'noTeam',
  'howToParticipate',
  'online',
] as const;

export const ALL_FAQ_QUESTIONS = [
  ...FEATURED_FAQ_QUESTIONS,
  'whatIs',
  'organizers',
  'otherEvents',
  'certificates',
  'noAnswer',
] as const;
