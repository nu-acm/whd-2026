import { describe, expect, it } from 'vite-plus/test';
import { cleanName } from '@/lib/ai.server';

describe('cleanName', () => {
  it('strips quotes and trailing punctuation', () => {
    expect(cleanName('"Pixel Queens".')).toBe('Pixel Queens');
    expect(cleanName('«Код Сұлу»')).toBe('Код Сұлу');
  });

  it('keeps only the first line', () => {
    expect(cleanName('Byte Bloom\nThis name means…')).toBe('Byte Bloom');
  });

  it('caps the length at 30 characters', () => {
    expect(cleanName('a'.repeat(50))).toHaveLength(30);
  });
});
