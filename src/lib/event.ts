/**
 * Single source of truth for everything that changes from one edition to the
 * next. Dates and copy live in the locale files; only links and machine-read
 * values belong here.
 */

export const VENUE_MAP_URL = 'https://maps.google.com/?q=Nazarbayev+University';

export const CONTACT_EMAIL = 'acm_w@nu.edu.kz';

export const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/nuacm_wsc/',
  telegram: 'https://t.me/nu_acm_w',
  tiktok: 'https://www.tiktok.com/@nuacmsc',
  email: `https://mail.google.com/mail/?view=cm&fs=1&to=${CONTACT_EMAIL}&su=&body=`,
} as const;

/** Participant chat — used by the FAQ answers. */
export const TELEGRAM_CHAT_URL = 'https://t.me/whd_2026';

export const CODE_OF_CONDUCT_URL =
  'https://drive.google.com/file/d/1omx4qtnA4DYh6qeLnf9o_lQiF8wSb2HG/view?usp=sharing';
export const INSTRUCTIONS_AND_RULES_URL =
  'https://drive.google.com/file/d/1lblOCnzRenDdfWUR13vQMKcli6M9exZf/view?usp=sharing';

/** Calendar date in Astana, used for participant age on the event day. */
export const EVENT_DATE = '2026-11-14';

/** Shared program for the schedule and the three challenge cards. */
export const EVENT_SCHEDULE = [
  { time: '09:00 - 10:00', id: 'registration', venue: 'redHall' },
  { time: '10:00 - 10:30', id: 'opening', venue: 'redHall' },
  { time: '11:00 - 12:00', id: 'programming', venue: 'ballroomLeft' },
  { time: '12:30 - 13:30', id: 'mathematics', venue: 'ballroomLeft' },
  { time: '13:30 - 14:30', id: 'coffeeBreak', venue: 'c3Vestibule' },
  { time: '14:45 - 16:45', id: 'productDesign', venue: 'ballroomLeft' },
  { time: '17:00 - 18:00', id: 'pitching', venue: 'pitching' },
  { time: '18:30 - 19:00', id: 'closing', venue: 'redHall' },
] as const;
