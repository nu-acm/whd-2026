import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { getReportData } from '@/lib/report.server';

interface AppEnv {
  GAS_SECRET?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** Constant-time string compare, so the secret cannot be guessed byte by byte. */
function safeEqual(a: string, b: string) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/**
 * Participants, teams and stats as JSON, for the Google Apps Script that syncs
 * them to a spreadsheet. POST only; the body must carry `{ "secret": GAS_SECRET }`.
 * Serves: /api/report
 */
export const Route = createFileRoute('/api/report')({
  server: {
    handlers: {
      GET: () => json({ error: 'Method not allowed; use POST' }, 405),
      POST: async ({ request }) => {
        const secret = (env as unknown as AppEnv).GAS_SECRET;
        if (!secret) return json({ error: 'Report API not configured' }, 500);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: 'Invalid JSON body' }, 400);
        }
        if (
          typeof body !== 'object' ||
          body === null ||
          !('secret' in body) ||
          typeof body.secret !== 'string' ||
          !safeEqual(body.secret, secret)
        ) {
          return json({ error: 'Unauthorized' }, 401);
        }

        try {
          return json(await getReportData());
        } catch (err) {
          console.error('[report API]', err);
          return json({ error: 'Failed to fetch report data' }, 500);
        }
      },
    },
  },
});
