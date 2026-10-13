import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from 'cloudflare:workers';
import { TestD1 } from '@/test/d1';
import { deleteCv, uploadCv } from './cv.server';
import { CV_ERRORS, CV_MAX_BYTES, driveFileUrl } from './cv';
import { getParticipant } from './onboarding.server';

const { callGas } = vi.hoisted(() => ({ callGas: vi.fn() }));
vi.mock('@/lib/gas.server', () => ({ callGas }));
let db: TestD1;
const oldId = 'oldCvFile123';
const newId = 'newCvFile123';
const pdf = () => new File(['%PDF-1.7\ncontent'], 'cv.pdf', { type: 'application/pdf' });

beforeEach(() => {
  db = new TestD1();
  db.seedUser('u0');
  Object.assign(env, { DB: db.binding });
  callGas.mockReset().mockResolvedValue({ ok: true, fileId: newId });
});
afterEach(() => {
  db.close();
  delete (env as { DB?: D1Database }).DB;
  vi.restoreAllMocks();
});
function previousCv() {
  db.sqlite
    .prepare('UPDATE participant SET cv_url = ? WHERE id = ?')
    .run(driveFileUrl(oldId), 'u0');
}

describe('CV persistence', () => {
  it('stores the uploaded file for its owner and trashes the previous CV afterwards', async () => {
    previousCv();
    callGas.mockImplementation(async (action) => {
      if (action === 'delete-cv') {
        expect((await getParticipant('u0'))?.cvUrl).toBe(driveFileUrl(newId));
      }
      return { ok: true, fileId: newId };
    });
    await uploadCv('u0', pdf());
    expect(callGas).toHaveBeenNthCalledWith(1, 'upload-cv', {
      fileName: 'u0 - u0.pdf',
      base64: Buffer.from('%PDF-1.7\ncontent').toString('base64'),
    });
    expect(callGas).toHaveBeenNthCalledWith(2, 'delete-cv', { fileId: oldId });
    expect((await getParticipant('u0'))?.cvUrl).toBe(driveFileUrl(newId));
  });

  it.each(['webhook failure', 'invalid file id'])(
    'preserves the previous CV on %s',
    async (failure) => {
      previousCv();
      vi.spyOn(console, 'error').mockImplementation(() => {});
      if (failure === 'webhook failure')
        callGas.mockRejectedValue(new Error('Service unavailable'));
      else callGas.mockResolvedValue({ ok: true, fileId: '../invalid' });
      await expect(uploadCv('u0', pdf())).rejects.toThrow(CV_ERRORS.failed);
      expect((await getParticipant('u0'))?.cvUrl).toBe(driveFileUrl(oldId));
      expect(callGas).toHaveBeenCalledTimes(1);
    },
  );

  it('keeps the new CV when cleanup of the previous file fails', async () => {
    previousCv();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    callGas
      .mockResolvedValueOnce({ ok: true, fileId: newId })
      .mockRejectedValueOnce(new Error('Cleanup failed'));
    await expect(uploadCv('u0', pdf())).resolves.toBeUndefined();
    expect((await getParticipant('u0'))?.cvUrl).toBe(driveFileUrl(newId));
  });

  it('does not trash a file when the returned id is the existing file', async () => {
    previousCv();
    callGas.mockResolvedValue({ ok: true, fileId: oldId });
    await uploadCv('u0', pdf());
    expect(callGas).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid bytes, oversized files, and missing profiles before calling Drive', async () => {
    await expect(uploadCv('u0', new File(['html'], 'fake.pdf'))).rejects.toThrow(CV_ERRORS.notPdf);
    await expect(
      uploadCv('u0', new File([new Uint8Array(CV_MAX_BYTES + 1)], 'big.pdf')),
    ).rejects.toThrow(CV_ERRORS.tooLarge);
    await expect(uploadCv('missing', pdf())).rejects.toThrow(CV_ERRORS.noProfile);
    expect(callGas).not.toHaveBeenCalled();
  });

  it('deletes the stored CV and allows repeated deletion', async () => {
    previousCv();
    await deleteCv('u0');
    expect(callGas).toHaveBeenCalledWith('delete-cv', { fileId: oldId });
    expect((await getParticipant('u0'))?.cvUrl).toBeNull();
    await deleteCv('u0');
    expect(callGas).toHaveBeenCalledTimes(1);
  });

  it('keeps the stored URL if Drive deletion fails', async () => {
    previousCv();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    callGas.mockRejectedValue(new Error('Service unavailable'));
    await expect(deleteCv('u0')).rejects.toThrow(CV_ERRORS.failed);
    expect((await getParticipant('u0'))?.cvUrl).toBe(driveFileUrl(oldId));
  });

  it('clears a legacy URL without sending an unrelated file to Drive', async () => {
    db.sqlite
      .prepare('UPDATE participant SET cv_url = ? WHERE id = ?')
      .run('https://example.com/cv.pdf', 'u0');
    await deleteCv('u0');
    expect((await getParticipant('u0'))?.cvUrl).toBeNull();
    expect(callGas).not.toHaveBeenCalled();
  });
});
