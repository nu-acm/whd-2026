import { betterAuth } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';

/**
 * Node-only configuration for generating the Drizzle auth schema with `auth`.
 * The CLI selects Drizzle and SQLite explicitly; no database connection is needed.
 * Request-time authentication lives in auth.server.ts.
 */
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  appName: "Women's Hack Day",
  ...(process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET && {
      socialProviders: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      },
    }),
  plugins: [
    emailOTP({
      async sendVerificationOTP() {
        // no-op: this config exists only for schema generation
      },
    }),
  ],
});
