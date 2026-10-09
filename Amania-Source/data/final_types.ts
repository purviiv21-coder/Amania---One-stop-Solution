export type Role = 'Owner' | 'Admin' | 'Student';
export type Tab = 'space' | 'explore' | 'trade' | 'clubs';
export type CalendarMode = 'Month' | 'Week' | 'Day';

export type CampusEvent = {
  id: string;
  title: string;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  organizer: string;
  description: string;
  posterUri: string;
  publishedBy: string;
  createdAt: number;
};

export type AppData = {
  version: 1;
  events: CampusEvent[];
  favorites: string[];
  notes: string[];
  avatar: string;
  notificationIds: Record<string, string[]>;
};

export type ExtractedEvent = Omit<CampusEvent, 'id' | 'posterUri' | 'publishedBy' | 'createdAt'>;

export type ClubProfile = {
  id: 'inara' | 'coderit' | 'debsoc';
  name: string;
  category: string;
  tagline: string;
  about: string;
  whyJoin: string;
  achievements: string[];
  joiningInfo: string;
  instagramUrl: string;
  whatsappUrl: string;
  president: string;
  email: string;
  bannerUri: string;
};

export const EMPTY_DATA: AppData = {
  version: 1,
  events: [],
  favorites: [],
  notes: [],
  avatar: '🐸',
  notificationIds: {},
};
