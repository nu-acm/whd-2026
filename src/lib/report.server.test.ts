import { describe, expect, it } from 'vite-plus/test';
import { participantsToCsv, type ReportParticipant } from '@/lib/report.server';

const row: ReportParticipant = {
  id: 'u1',
  fullName: 'Aruzhan "Aru" Sadykova',
  email: 'aru@example.com',
  iin: '050919501086',
  phone: '77001234567',
  city: 'Astana',
  placeOfStudy: 'NIS, Astana',
  parentPhone: null,
  educationLevel: 'School',
  cvUrl: null,
  teamName: 'Binary Blossoms',
  teamSlug: 'binary-blossoms',
  teamEligible: true,
  attended: true,
  createdAt: '2026-10-01T10:00:00.000Z',
};

describe('participantsToCsv', () => {
  it('writes a header and one line per participant', () => {
    const lines = participantsToCsv([row]).split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^Full name,Email,IIN/);
  });

  it('quotes fields with commas and doubles embedded quotes', () => {
    const line = participantsToCsv([row]).split('\n')[1];
    expect(line).toContain('"Aruzhan ""Aru"" Sadykova"');
    expect(line).toContain('"NIS, Astana"');
  });

  it('writes empty cells for nulls and yes/no for attendance', () => {
    const line = participantsToCsv([row]).split('\n')[1];
    expect(line).toContain('77001234567,Astana,"NIS, Astana",,School');
    expect(line).toContain(',yes,');
  });

  it.each(['=1+1', '+1+1', '-1+1', '@SUM(1)', '  =1+1', '\u0000=1+1', '\t=1+1'])(
    'exports %j as literal text instead of a formula',
    (fullName) => {
      const line = participantsToCsv([{ ...row, fullName }]).split('\n')[1];
      expect(line.startsWith(`'${fullName},`)).toBe(true);
    },
  );

  it('quotes carriage returns and newlines after neutralizing formula prefixes', () => {
    const csv = participantsToCsv([{ ...row, fullName: '\r=1+1', city: '\n=1+1' }]);
    expect(csv).toContain('"\'\r=1+1"');
    expect(csv).toContain('"\'\n=1+1"');
  });

  it('preserves a leading-zero IIN as text without constructing a formula', () => {
    const csv = participantsToCsv([{ ...row, iin: '050919501086' }]);
    expect(csv).toContain(",'050919501086,");
    expect(csv).not.toContain('="050919501086"');
  });
});
