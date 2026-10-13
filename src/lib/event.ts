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
export const TELEGRAM_CHAT_URL = 'https://t.me/WHD_chat';

/** Shared program for the schedule and the three challenge cards. */
export const EVENT_SCHEDULE = [
  { time: '09:00 - 10:00', id: 'registration' },
  { time: '10:00 - 11:00', id: 'opening' },
  { time: '11:00 - 12:00', id: 'mathematics' },
  { time: '12:00 - 13:00', id: 'programming' },
  { time: '13:00 - 14:00', id: 'coffeeBreak' },
  { time: '14:00 - 16:00', id: 'productDesign' },
  { time: '16:00 - 17:00', id: 'pitching' },
  { time: '17:30 - 18:30', id: 'closing' },
] as const;
