import { createAuthClient } from 'better-auth/react';
import { emailOTPClient } from 'better-auth/client/plugins';

/** Browser-side auth client: sign in/out and session access. */
export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
  plugins: [emailOTPClient()],
});

export const { signIn, signOut, useSession } = authClient;

/** Better Auth resolves HTTP failures with an error object instead of rejecting. */
export async function sendSignInCode(email: string) {
  const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' });
  if (error) throw new Error('login.sendFailed');
}
