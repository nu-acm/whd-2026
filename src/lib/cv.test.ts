import { describe, expect, it } from 'vite-plus/test';
import {
  CV_ERRORS,
  CV_MAX_BYTES,
  cvFileName,
  driveFileIdFromUrl,
  driveFileUrl,
  isDriveFileId,
  toBase64,
  validateCvBytes,
} from '@/lib/cv';

const pdf = (extra = 'rest of file') => new TextEncoder().encode(`%PDF-1.7\n${extra}`);

describe('validateCvBytes', () => {
  it('accepts bytes that start with the PDF signature', () => {
    expect(validateCvBytes(pdf())).toBeNull();
  });

  it('rejects a non-PDF file even if it was named .pdf', () => {
    expect(validateCvBytes(new TextEncoder().encode('<html>'))).toBe(CV_ERRORS.notPdf);
  });

  it('rejects an empty file', () => {
    expect(validateCvBytes(new Uint8Array())).toBe(CV_ERRORS.notPdf);
  });

  it('rejects a file over the size limit', () => {
    const big = new Uint8Array(CV_MAX_BYTES + 1);
    big.set(pdf());
    expect(validateCvBytes(big)).toBe(CV_ERRORS.tooLarge);
  });
});

describe('Drive links', () => {
  const id = '1AbC_dEf-GhIjKlMnOp';

  it('round-trips a file id through the stored URL', () => {
    expect(driveFileIdFromUrl(driveFileUrl(id))).toBe(id);
  });

  it('returns null for a link that is not a Drive file', () => {
    expect(driveFileIdFromUrl('https://example.com/cv.pdf')).toBeNull();
  });

  it('only accepts plausible file ids', () => {
    expect(isDriveFileId(id)).toBe(true);
    expect(isDriveFileId('../../etc')).toBe(false);
    expect(isDriveFileId(42)).toBe(false);
  });
});

describe('cvFileName', () => {
  it('keeps Cyrillic letters and adds a short id', () => {
    expect(cvFileName('Әйгерім Нұрлан', 'abcdef123456')).toBe('Әйгерім Нұрлан - abcdef12.pdf');
  });

  it('strips characters that are unsafe in file names', () => {
    expect(cvFileName('a/b\\c:<d>', 'u1')).toBe('abcd - u1.pdf');
  });

  it('falls back when nothing is left of the name', () => {
    expect(cvFileName('///', 'u1')).toBe('participant - u1.pdf');
  });
});

describe('toBase64', () => {
  it('matches the platform encoder, including across chunk boundaries', () => {
    const bytes = new Uint8Array(70_000).map((_, i) => i % 256);
    expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
  });
});
