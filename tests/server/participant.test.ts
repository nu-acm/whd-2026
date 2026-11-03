import { expect, it, vi } from 'vite-plus/test';
import { uploadCv, deleteCv } from '@/lib/cv.server';
import { CV_ERRORS, CV_MAX_BYTES, driveFileUrl } from '@/lib/cv';
import { getParticipant, upsertParticipant } from '@/lib/onboarding.server';
import { createTeam } from '@/lib/team.server';
import { setAttendance } from '@/lib/checkin.server';
import { Route } from '@/routes/api/cv';
import { bindings, mockWebhook, profile, seedParticipant, signIn } from './support';
import { DOCUMENTS_POLICY_VERSION, REGISTRATION_POLICY_VERSION } from '@/lib/consent';

const handlers = (() => {
  const configured = Route.options.server?.handlers;
  if (!configured || typeof configured === 'function')
    throw new Error('CV route handlers are required');
  return configured;
})();

async function dispatch(
  method: 'POST' | 'DELETE',
  cookie?: string,
  body?: FormData,
  origin = bindings.BETTER_AUTH_URL,
) {
  const request = new Request(`${bindings.BETTER_AUTH_URL}/api/cv`, {
    method,
    headers: { origin, ...(cookie && { cookie }) },
    ...(body && { body }),
  });
  const handler = method === 'POST' ? handlers.POST : handlers.DELETE;
  if (!handler) throw new Error(`CV ${method} handler is required`);
  const response = await handler({
    request,
    params: {},
    pathname: '/api/cv',
    context: undefined,
    next: vi.fn(),
  });
  if (!(response instanceof Response)) throw new Error('Expected an HTTP response');
  return response;
}

it('edits profile fields without resetting membership, attendance, CV, or registration time', async () => {
  await seedParticipant('owner');
  const team = await createTeam('owner', 'Profile Team');
  await setAttendance('owner', true);
  mockWebhook();
  await uploadCv('owner', new File(['%PDF-1.7\ncontent'], 'cv.pdf'));
  await bindings.DB.prepare(
    'UPDATE participant SET consented_at = 1, documents_acknowledged_at = 2 WHERE id = ?',
  )
    .bind('owner')
    .run();
  const original = await getParticipant('owner');
  await upsertParticipant({
    userId: 'owner',
    ...profile,
    fullName: 'Changed Name',
    city: 'Almaty',
  });
  expect(await getParticipant('owner')).toMatchObject({
    fullName: 'Changed Name',
    city: 'Almaty',
    teamId: team.id,
    attended: true,
    cvUrl: driveFileUrl('testDriveFile123'),
    createdAt: original?.createdAt,
    consentedAt: original?.consentedAt,
    consentPolicyVersion: REGISTRATION_POLICY_VERSION,
    documentsAcknowledgedAt: original?.documentsAcknowledgedAt,
    documentsPolicyVersion: DOCUMENTS_POLICY_VERSION,
  });
});

it('refuses profile writes without explicit consent to the current policy', async () => {
  const valid = { userId: 'no-consent', ...profile };
  for (const data of [
    { ...valid, consent: false },
    { ...valid, consent: undefined },
    { ...valid, policyVersion: 'previous-policy' },
  ]) {
    await expect(upsertParticipant(data as typeof valid)).rejects.toThrow('validation.');
  }
  expect((await bindings.DB.prepare('SELECT id FROM participant').all()).results).toHaveLength(0);
});

it('refuses document acknowledgment bypasses without changing the saved profile', async () => {
  await seedParticipant('documents');
  const original = await getParticipant('documents');
  const valid = { userId: 'documents', ...profile, fullName: 'Rejected change' };
  for (const data of [
    { ...valid, documentsRead: false },
    { ...valid, documentsRead: undefined },
    { ...valid, documentsRead: 'true' },
    { ...valid, documentsPolicyVersion: undefined },
    { ...valid, documentsPolicyVersion: 'previous-documents' },
  ]) {
    await expect(upsertParticipant(data as typeof valid)).rejects.toThrow('validation.documents');
    expect(await getParticipant('documents')).toEqual(original);
  }
});

it('records document acknowledgment for missing or outdated versions without inventing acceptance', async () => {
  await seedParticipant('documents');
  for (const [timestamp, version] of [
    [null, null],
    [null, DOCUMENTS_POLICY_VERSION],
    [1, 'previous-documents'],
  ] as const) {
    await bindings.DB.prepare(
      'UPDATE participant SET documents_acknowledged_at = ?, documents_policy_version = ? WHERE id = ?',
    )
      .bind(timestamp, version, 'documents')
      .run();
    const original = await getParticipant('documents');
    expect(original?.documentsAcknowledgedAt?.getTime() ?? null).toBe(timestamp);
    expect(original?.documentsPolicyVersion).toBe(version);
    const before = Date.now();
    await upsertParticipant({ userId: 'documents', ...profile });
    const accepted = await getParticipant('documents');
    expect(accepted?.documentsAcknowledgedAt?.getTime()).toBeGreaterThanOrEqual(before);
    expect(accepted?.documentsPolicyVersion).toBe(DOCUMENTS_POLICY_VERSION);
    expect(accepted?.consentedAt).toEqual(original?.consentedAt);
  }
});

it('enforces guardian contact on the server for a minor attending college', async () => {
  await seedParticipant('college-minor');
  const minor = {
    userId: 'college-minor',
    ...profile,
    iin: '101101600001',
    educationLevel: 'College',
  } as const;
  await expect(upsertParticipant(minor)).rejects.toThrow('validation.parentPhoneRequired');
  expect((await getParticipant('college-minor'))?.iin).toBe(profile.iin);
  await upsertParticipant({ ...minor, parentPhone: '+7 702 000 00 00' });
  expect(await getParticipant('college-minor')).toMatchObject({
    iin: minor.iin,
    educationLevel: 'College',
    parentPhone: '77020000000',
  });
});

it('records acceptance for legacy profiles without inventing earlier consent', async () => {
  await seedParticipant('legacy');
  await bindings.DB.prepare(
    'UPDATE participant SET consented_at = NULL, consent_policy_version = NULL WHERE id = ?',
  )
    .bind('legacy')
    .run();
  expect(await getParticipant('legacy')).toMatchObject({
    consentedAt: null,
    consentPolicyVersion: null,
  });
  const before = Date.now();
  await upsertParticipant({ userId: 'legacy', ...profile });
  const accepted = await getParticipant('legacy');
  expect(accepted?.consentedAt?.getTime()).toBeGreaterThanOrEqual(before);
  expect(accepted?.consentPolicyVersion).toBe(REGISTRATION_POLICY_VERSION);

  await bindings.DB.prepare(
    'UPDATE participant SET consented_at = 1, consent_policy_version = ? WHERE id = ?',
  )
    .bind('previous-policy', 'legacy')
    .run();
  await upsertParticipant({ userId: 'legacy', ...profile });
  expect((await getParticipant('legacy'))?.consentedAt?.getTime()).toBeGreaterThanOrEqual(before);
});

it('retains the previous CV on failed upload or deletion and saves replacements before cleanup', async () => {
  await seedParticipant('owner');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const pdf = new File(['%PDF-1.7\ncontent'], 'cv.pdf');
  const webhook = mockWebhook();
  await uploadCv('owner', pdf);
  const oldUrl = driveFileUrl('testDriveFile123');
  webhook.mockResolvedValue(Response.json({ ok: false }));
  await expect(uploadCv('owner', pdf)).rejects.toThrow(CV_ERRORS.failed);
  expect((await getParticipant('owner'))?.cvUrl).toBe(oldUrl);
  await expect(deleteCv('owner')).rejects.toThrow(CV_ERRORS.failed);
  expect((await getParticipant('owner'))?.cvUrl).toBe(oldUrl);
  webhook.mockImplementation(async (input, init) => {
    const body = (await new Request(input, init).json()) as { action: string };
    return Response.json(
      body.action === 'upload-cv' ? { ok: true, fileId: 'replacementFile123' } : { ok: false },
    );
  });
  await uploadCv('owner', pdf);
  expect((await getParticipant('owner'))?.cvUrl).toBe(driveFileUrl('replacementFile123'));
  webhook.mockImplementation(async () => Response.json({ ok: true }));
  await deleteCv('owner');
  expect((await getParticipant('owner'))?.cvUrl).toBeNull();
});

it('rejects invalid and oversized PDFs before sending them to Drive', async () => {
  await seedParticipant('owner');
  const webhook = mockWebhook();
  await expect(uploadCv('owner', new File(['html'], 'fake.pdf'))).rejects.toThrow(CV_ERRORS.notPdf);
  await expect(
    uploadCv('owner', new File([new Uint8Array(CV_MAX_BYTES + 1)], 'large.pdf')),
  ).rejects.toThrow(CV_ERRORS.tooLarge);
  expect(webhook).not.toHaveBeenCalled();
  expect((await getParticipant('owner'))?.cvUrl).toBeNull();
});

it('authorizes CV requests with real sessions and enforces origin and registration closure', async () => {
  const { cookie, user } = await signIn();
  await upsertParticipant({ userId: user.id, ...profile });
  const webhook = mockWebhook();
  for (const method of ['POST', 'DELETE'] as const) {
    expect((await dispatch(method)).status).toBe(401);
    expect((await dispatch(method, cookie, undefined, 'https://other.example.test')).status).toBe(
      403,
    );
  }
  const form = new FormData();
  form.set('file', new File(['%PDF-1.7\ncontent'], 'cv.pdf'));
  expect((await dispatch('POST', cookie, form)).status).toBe(200);
  expect((await getParticipant(user.id))?.cvUrl).toBe(driveFileUrl('testDriveFile123'));
  const calls = webhook.mock.calls.length;
  bindings.REGISTRATION_DEADLINE = new Date(Date.now()).toISOString();
  for (const method of ['POST', 'DELETE'] as const)
    expect((await dispatch(method, cookie)).status).toBe(403);
  expect(webhook).toHaveBeenCalledTimes(calls);
  expect((await getParticipant(user.id))?.cvUrl).toBe(driveFileUrl('testDriveFile123'));
});
