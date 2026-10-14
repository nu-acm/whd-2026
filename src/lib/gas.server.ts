import { env } from 'cloudflare:workers';

interface GasEnv {
  GAS_URL?: string;
  GAS_SECRET?: string;
}

/** True when the Apps Script webhook (mail + Drive) is configured. */
export function isGasConfigured() {
  const { GAS_URL, GAS_SECRET } = env as unknown as GasEnv;
  return !!GAS_URL && !!GAS_SECRET;
}

/**
 * Run an action on the Apps Script web app (see gas/Code.gs) and return its
 * reply. Throws when it is not configured or the action failed.
 */
export async function callGas<T extends object = object>(
  action: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const { GAS_URL: url, GAS_SECRET: secret } = env as unknown as GasEnv;
  if (!url || !secret)
    throw new Error('Apps Script webhook is not configured (GAS_URL, GAS_SECRET)');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, action, ...payload }),
  });
  if (!res.ok) throw new Error(`Apps Script returned HTTP ${res.status}`);

  // Apps Script answers 200 even on failure; the verdict is in the body.
  const reply = (await res.json().catch(() => null)) as
    | ({ ok?: boolean; error?: string } & T)
    | null;
  if (!reply?.ok)
    throw new Error(`Apps Script ${action} failed: ${reply?.error ?? 'non-JSON response'}`);
  return reply;
}
