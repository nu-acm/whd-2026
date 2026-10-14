import type { getReportData } from '@/lib/report.server';
import type { CheckinData } from '@/lib/checkin.server';

export function reportFixture(): Awaited<ReturnType<typeof getReportData>> {
  const participants = ['Alpha 10', 'alpha 2', 'Zulu'].map((fullName, index) => ({
    id: `p${index}`,
    fullName,
    email: `participant${index}@example.test`,
    iin: `05091950108${index}`,
    phone: `7700000000${index}`,
    parentPhone: index === 0 ? '77019998888' : null,
    city: index === 0 ? 'Astana' : 'Almaty',
    placeOfStudy: 'Test University',
    educationLevel: "Bachelor's",
    cvUrl: index === 0 ? 'https://example.test/cv.pdf' : null,
    teamName: index < 2 ? 'Team 2' : 'Team 10',
    teamSlug: index < 2 ? 'team-2' : 'team-10',
    teamEligible: index < 2,
    attended: index === 0,
    createdAt: `2026-10-0${index + 1}T00:00:00Z`,
  }));
  return {
    participants,
    teams: [
      {
        name: 'Team 10',
        inviteSlug: 'team-10',
        captainName: 'Zulu',
        memberCount: 1,
        eligible: false,
        members: participants.slice(2),
        createdAt: '2026-10-03T00:00:00Z',
      },
      {
        name: 'Team 2',
        inviteSlug: 'team-2',
        captainName: 'Alpha 10',
        memberCount: 2,
        eligible: true,
        members: participants.slice(0, 2),
        createdAt: '2026-10-01T00:00:00Z',
      },
    ],
    stats: { participants: 3, teams: 2, eligibleTeams: 1, teamless: 0, attended: 1 },
  };
}

export function checkinFixture(): CheckinData {
  const participants = [
    'Alpha 10',
    'alpha 2',
    'Beta',
    'Charlie',
    'Delta',
    'Echo',
    'Foxtrot',
    'Hotel',
    'Zulu',
  ].map((fullName, index) => ({
    id: `p${index}`,
    fullName,
    iin: `05091950108${index}`,
    phone: `7700000000${index}`,
    teamId: index < 3 ? 'ready' : index < 6 ? 'partial' : 'no-show',
    teamName: index < 3 ? 'Team 2' : index < 6 ? 'Team 10' : 'Team 3',
    placeOfStudy: 'Test University',
    educationLevel: "Bachelor's",
    attended: index < 4,
  }));
  return {
    participants,
    teams: [
      { id: 'ready', name: 'Team 2', captainName: 'Alpha 10', members: participants.slice(0, 3) },
      { id: 'partial', name: 'Team 10', captainName: 'Beta', members: participants.slice(3, 6) },
      { id: 'no-show', name: 'Team 3', captainName: 'Echo', members: participants.slice(6) },
    ],
  };
}
