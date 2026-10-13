/** Stable keys shared by team mutations and their translated error messages. */
export const TEAM_ERRORS = {
  noProfile: 'teamErrors.noProfile',
  alreadyInTeam: 'teamErrors.alreadyInTeam',
  nameTaken: 'teamErrors.nameTaken',
  nameNeedsLetters: 'teamErrors.nameNeedsLetters',
  slugUnavailable: 'teamErrors.slugUnavailable',
  invalidInvite: 'teamErrors.invalidInvite',
  full: 'teamErrors.full',
  notInTeam: 'teamErrors.notInTeam',
  notFound: 'teamErrors.notFound',
  cannotRemoveSelf: 'teamErrors.cannotRemoveSelf',
  captainOnlyRemove: 'teamErrors.captainOnlyRemove',
  memberNotInTeam: 'teamErrors.memberNotInTeam',
  captainCannotLeave: 'teamErrors.captainCannotLeave',
  captainOnlyDissolve: 'teamErrors.captainOnlyDissolve',
  failed: 'dashboard.actionFailed',
} as const;
