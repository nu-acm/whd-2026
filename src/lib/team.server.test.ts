import { describe, expect, it } from 'vite-plus/test';
import { canonicalizeTeamName, slugify } from '@/lib/team.server';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Cool Hackers!!')).toBe('cool-hackers');
  });

  it('transliterates Russian and Kazakh letters', () => {
    expect(slugify('Команда Альфа')).toBe('komanda-alyfa');
    expect(slugify('Қыздар')).toMatch(/^[a-z0-9-]+$/);
  });

  it('matches the invite slug format', () => {
    expect(slugify('  --Binary   Blossoms--  ')).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});

describe('canonicalizeTeamName', () => {
  it('treats case and spacing differences as the same name', () => {
    expect(canonicalizeTeamName('Binary  Blossoms')).toBe(canonicalizeTeamName('binary blossoms'));
  });
});
