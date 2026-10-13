/** Shared UI cooldown; the server enforces this across tabs and Worker instances. */
export const AI_COOLDOWN_MS = 5_000;
export const AI_WINDOW_MS = 60 * 60 * 1_000;
export const AI_REQUESTS_PER_WINDOW = 30;
export const AI_RATE_LIMIT_ERROR = 'dashboard.generateRateLimited';
